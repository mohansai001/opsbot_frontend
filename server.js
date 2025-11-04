import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Connection
const pool = new Pool({
  connectionString: "postgresql+psycopg2://retool:npg_a2Dck4vBuXpH@ep-young-dust-afizvmne.c-2.us-west-2.retooldb.com/retool?sslmode=require",
  ssl: {
    rejectUnauthorized: false
  }
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error connecting to PostgreSQL:', err);
  } else {
    console.log('✅ Connected to PostgreSQL database');
    release();
  }
});

// Google Generative AI setup
import { GoogleGenerativeAI } from '@google/generative-ai';
const genAI = new GoogleGenerativeAI('AIzaSyDiB4eEW2OLHKyAIQaBHfsGPaEnCwCeLH4');

// Database schema helper
async function getDatabaseSchema() {
  try {
    const query = `
      SELECT 
        table_name, 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `;
    
    const result = await pool.query(query);
    
    // Group columns by table
    const schema = {};
    result.rows.forEach(row => {
      if (!schema[row.table_name]) {
        schema[row.table_name] = [];
      }
      schema[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      });
    });
    
    return schema;
  } catch (error) {
    console.error('Error getting database schema:', error);
    return {};
  }
}

// SQL Query Generator using AI
async function generateSQLQuery(naturalLanguageQuery, schema) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const schemaDescription = Object.entries(schema)
    .map(([tableName, columns]) => {
      const columnList = columns
        .map(col => `${col.column} (${col.type})`)
        .join(', ');
      return `Table "${tableName}": ${columnList}`;
    })
    .join('\n');

  const prompt = `
Given this PostgreSQL database schema:
${schemaDescription}

Convert this natural language query to SQL:
"${naturalLanguageQuery}"

Rules:
1. Return ONLY the SQL query, no explanations
2. Use proper PostgreSQL syntax
3. Include appropriate WHERE clauses if needed
4. Limit results to 50 rows for performance
5. Use table and column names exactly as shown in the schema

SQL Query:`;

  try {
    const result = await model.generateContent(prompt);
    const sqlQuery = result.response.text().trim();
    
    // Clean up the SQL query
    const cleanedQuery = sqlQuery
      .replace(/^```sql\s*/i, '')
      .replace(/\s*```$/i, '')
      .replace(/^SQL Query:\s*/i, '')
      .trim();
    
    return cleanedQuery;
  } catch (error) {
    console.error('Error generating SQL:', error);
    throw new Error('Failed to generate SQL query');
  }
}

// Execute SQL and format results
async function executeSQLQuery(sqlQuery) {
  try {
    console.log('🔍 Executing SQL:', sqlQuery);
    const result = await pool.query(sqlQuery);
    
    return {
      success: true,
      data: result.rows,
      rowCount: result.rowCount,
      fields: result.fields?.map(field => field.name) || []
    };
  } catch (error) {
    console.error('SQL Execution Error:', error);
    return {
      success: false,
      error: error.message,
      sqlQuery: sqlQuery
    };
  }
}

// Generate natural language response
async function generateNaturalResponse(query, sqlResult, originalQuestion) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  let prompt;
  
  if (sqlResult.success && sqlResult.data.length > 0) {
    const dataPreview = sqlResult.data.slice(0, 5); // Show first 5 rows
    prompt = `
Based on this database query result, provide a natural language answer to the user's question.

User's Question: "${originalQuestion}"
SQL Query Used: ${query}
Query Results (showing ${sqlResult.rowCount} total rows):
${JSON.stringify(dataPreview, null, 2)}

Provide a clear, helpful response that:
1. Directly answers the user's question
2. Includes relevant numbers and data points
3. Is written in a conversational tone
4. Mentions if there are more results than shown

Response:`;
  } else {
    prompt = `
The database query failed or returned no results.

User's Question: "${originalQuestion}"
SQL Query Attempted: ${query}
Error: ${sqlResult.error || 'No results found'}

Provide a helpful response that:
1. Explains why no data was found
2. Suggests alternative ways to phrase the question
3. Is polite and helpful

Response:`;
  }

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error('Error generating natural response:', error);
    return 'I found some data but had trouble explaining it. Please try rephrasing your question.';
  }
}

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log('📥 Received query:', message);

    // Get database schema
    const schema = await getDatabaseSchema();
    
    if (Object.keys(schema).length === 0) {
      return res.json({
        response: "I'm having trouble connecting to the database right now. Please try again later.",
        type: 'error'
      });
    }

    // Generate SQL query
    const sqlQuery = await generateSQLQuery(message, schema);
    
    // Execute SQL query
    const sqlResult = await executeSQLQuery(sqlQuery);
    
    // Generate natural language response
    const naturalResponse = await generateNaturalResponse(sqlQuery, sqlResult, message);

    // Prepare response
    const response = {
      response: naturalResponse,
      type: sqlResult.success ? 'success' : 'error',
      data: {
        sqlQuery: sqlQuery,
        resultCount: sqlResult.rowCount || 0,
        hasData: sqlResult.success && sqlResult.data && sqlResult.data.length > 0,
        preview: sqlResult.success ? sqlResult.data?.slice(0, 10) : null,
        fields: sqlResult.fields || []
      }
    };

    console.log('📤 Sending response:', {
      success: sqlResult.success,
      rowCount: sqlResult.rowCount,
      responseLength: naturalResponse.length
    });

    res.json(response);

  } catch (error) {
    console.error('❌ Chat endpoint error:', error);
    res.status(500).json({
      response: "I encountered an error while processing your request. Please try again or rephrase your question.",
      type: 'error',
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT 1 as health_check');
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get database tables endpoint
app.get('/api/tables', async (req, res) => {
  try {
    const schema = await getDatabaseSchema();
    res.json({
      success: true,
      tables: Object.keys(schema),
      schema: schema
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OpsBot Backend Server running on port ${PORT}`);
  console.log(`📊 Database: Connected to PostgreSQL`);
  console.log(`🤖 AI: Google Gemini 2.0 Flash`);
  console.log(`🌐 CORS: Enabled for all origins`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end(() => {
    console.log('📊 Database connection closed.');
    process.exit(0);
  });
});