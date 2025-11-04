import * as XLSX from 'xlsx';
import axios from 'axios';

class ExcelBlobService {
  constructor() {
    this.baseStorageUrl = 'https://gaigkyc.blob.core.windows.net/ops-data/OneDrive_1_9-10-2025';
    this.dataTypes = {
      'account': 'Account Details/Platform, App & Infra.xlsx',
      'bench': 'Bench Report/Bench Report _August Month.xlsx',
      'certification-july': 'Certification/App and Cloud Certification Data - July.xlsx',
      'certification-august': 'Certification/App and Cloud Certification data - August.xlsx',
      'certification': 'Certification/App and Cloud Certification data - August.xlsx', // Default to latest
      'gt-allocation': "GT's Allocation/Graduate Trainee Allocation Details.xlsx",
      'rrf-july': 'RRF/RRF JULY.xlsx',
      'rrf-august': 'RRF/RRF August.xlsx', 
      'rrf-september': 'RRF/RRF September.xlsx',
      'rrf': 'RRF/RRF September.xlsx', // Default to latest
      'utilization': 'Utilization/utilization-report.xlsx'
    };
  }

  /**
   * Fetch Excel data from Azure Blob Storage
   * @param {string} dataType - Type of data to fetch (account, bench, certification, etc.)
   * @returns {Promise<Object>} Parsed Excel data
   */
  async fetchExcelData(dataType) {
    try {
      console.log(`📊 Fetching ${dataType} data from Azure Blob Storage...`);
      
      const filePath = this.dataTypes[dataType];
      if (!filePath) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Properly encode the URL
      const encodedFilePath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
      const blobUrl = `${this.baseStorageUrl}/${encodedFilePath}`;
      console.log(`🔗 Blob URL: ${blobUrl}`);

      // Try multiple fetch approaches for Azure Blob Storage
      let response;
      const fetchOptions = [
        // Option 1: Standard fetch with minimal headers
        {
          method: 'GET',
          mode: 'cors',
          cache: 'no-cache',
          headers: {
            'Accept': '*/*',
          }
        },
        // Option 2: No-cors mode (may work for public blobs)
        {
          method: 'GET',
          mode: 'no-cors',
          cache: 'no-cache'
        }
      ];

      let lastError;
      for (const [index, options] of fetchOptions.entries()) {
        try {
          console.log(`🔄 Trying fetch approach ${index + 1}:`, options.mode);
          
          const fetchResponse = await fetch(blobUrl, options);
          
          if (options.mode === 'no-cors') {
            // For no-cors mode, we can't actually read the response due to CORS
            console.log('❌ No-cors fetch completed but cannot read response due to CORS');
            throw new Error('No-cors mode cannot read response data');
          } else if (fetchResponse.ok) {
            console.log(`✅ Fetch successful with status: ${fetchResponse.status}`);
            response = { 
              status: fetchResponse.status, 
              data: await fetchResponse.arrayBuffer() 
            };
            break;
          } else {
            throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
          }
        } catch (error) {
          console.log(`❌ Fetch approach ${index + 1} failed:`, error.message);
          lastError = error;
          continue;
        }
      }

      if (!response) {
        // Fall back to axios as last resort
        console.log('🔄 Falling back to axios...');
        response = await axios.get(blobUrl, {
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          }
        });
      }

      if (response.status !== 200) {
        throw new Error(`Failed to fetch file: HTTP ${response.status}`);
      }

      // Validate response data
      if (!response.data || response.data.byteLength === 0) {
        throw new Error('Response data is empty or invalid');
      }

      console.log(`📦 Received ${response.data.byteLength} bytes of Excel data`);

      // Parse the Excel file
      let workbook;
      try {
        workbook = XLSX.read(response.data, { type: 'array' });
      } catch (parseError) {
        throw new Error(`Failed to parse Excel file: ${parseError.message}`);
      }
      
      // Validate workbook
      if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('Excel file contains no worksheets');
      }
      
      // Get the first worksheet
      const worksheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[worksheetName];
      
      if (!worksheet) {
        throw new Error(`Worksheet '${worksheetName}' not found`);
      }
      
      // Convert to JSON
      let jsonData;
      try {
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      } catch (jsonError) {
        throw new Error(`Failed to convert worksheet to JSON: ${jsonError.message}`);
      }
      
      if (!jsonData || jsonData.length === 0) {
        throw new Error('Worksheet contains no data');
      }
      
      console.log(`📊 Parsed ${jsonData.length} rows from Excel`);
      
      // Process the data
      const processedData = this.processExcelData(jsonData, dataType);
      
      return {
        success: true,
        dataType: dataType,
        worksheetName: worksheetName,
        totalRows: processedData.length,
        data: processedData,
        blobUrl: blobUrl,
        lastFetched: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error fetching ${dataType} data:`, error);
      
      // Don't return mock data - we want real data only
      return {
        success: false,
        error: error.message,
        dataType: dataType,
        lastAttempted: new Date().toISOString()
      };
    }
  }

  /**
   * Process raw Excel data into structured format
   * @param {Array} rawData - Raw Excel data array
   * @param {string} dataType - Type of data being processed
   * @returns {Array} Processed data array
   */
  processExcelData(rawData, dataType) {
    if (!rawData || rawData.length === 0) {
      return [];
    }

    // Assume first row contains headers
    const headers = rawData[0];
    const dataRows = rawData.slice(1);

    // Convert to array of objects
    const processedData = dataRows
      .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
      .map((row, index) => {
        const rowData = { _rowIndex: index + 2 }; // +2 because we skip header and start from row 2
        
        headers.forEach((header, colIndex) => {
          if (header) {
            const cleanHeader = String(header).trim();
            const cellValue = row[colIndex];
            rowData[cleanHeader] = this.formatCellValue(cellValue);
          }
        });
        
        return rowData;
      });

    return processedData;
  }

  /**
   * Format cell values for display
   * @param {*} value - Raw cell value
   * @returns {string} Formatted value
   */
  formatCellValue(value) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }

    // Handle dates
    if (typeof value === 'number' && value > 25569 && value < 2958465) {
      // Excel date serial number range
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return new Date(date.y, date.m - 1, date.d).toLocaleDateString();
      }
    }

    // Handle numbers
    if (typeof value === 'number') {
      return value % 1 === 0 ? value.toString() : value.toFixed(2);
    }

    // Handle strings
    return String(value).trim();
  }

  /**
   * Generate HTML table from Excel data
   * @param {Object} fetchResult - Result from fetchExcelData
   * @returns {string} HTML table string
   */
  generateHtmlTable(fetchResult) {
    if (!fetchResult.success || !fetchResult.data || fetchResult.data.length === 0) {
      return this.generateErrorHtml(fetchResult);
    }

    const data = fetchResult.data;
    const headers = Object.keys(data[0]).filter(key => key !== '_rowIndex');
    
    let html = `
      <div class="excel-data-container">
        <div class="excel-header">
          <div class="excel-title">
            <h3>📊 ${this.getDisplayName(fetchResult.dataType)}</h3>
            <p>Source: ${fetchResult.worksheetName} | ${data.length} records ${fetchResult.isMockData ? '(Demo Data)' : ''}</p>
          </div>
          <div class="excel-meta">
            <span class="fetch-time">Last updated: ${new Date(fetchResult.lastFetched).toLocaleString()}</span>
          </div>
        </div>
        
        <div class="excel-table-container">
          <table class="excel-table">
            <thead>
              <tr>
                ${headers.map(header => `<th>${this.formatHeaderName(header)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
    `;

    // Generate unique ID for this table instance
    const tableId = `excel-table-${Date.now()}`;
    
    // Display all rows
    data.forEach((row, index) => {
      html += `<tr>`;
      headers.forEach(header => {
        const value = row[header] || '-';
        html += `<td>${value}</td>`;
      });
      html += '</tr>';
    });

    html += `
            </tbody>
          </table>
        </div>
        
        <div class="excel-footer">
          <a href="${fetchResult.blobUrl}" target="_blank" class="download-link">
            📥 View Full Excel File
          </a>
        </div>
      </div>
    `;

    return html;
  }

  /**
   * Generate error HTML
   * @param {Object} errorResult - Error result object
   * @returns {string} Error HTML string
   */
  generateErrorHtml(errorResult) {
    return `
      <div class="excel-error-container">
        <div class="excel-error">
          <h4>❌ Unable to Load Excel Data</h4>
          <p><strong>Data Type:</strong> ${this.getDisplayName(errorResult.dataType)}</p>
          <p><strong>Error:</strong> ${errorResult.error}</p>
          <p><strong>Attempted:</strong> ${new Date(errorResult.lastAttempted).toLocaleString()}</p>
        </div>
        <div class="excel-retry">
          <button class="retry-btn" onclick="retryExcelLoad('${errorResult.dataType}')">
            🔄 Retry Loading
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Format header names for display
   * @param {string} header - Original header name
   * @returns {string} Formatted header name
   */
  formatHeaderName(header) {
    return header
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get display name for data type
   * @param {string} dataType - Data type key
   * @returns {string} Display name
   */
  getDisplayName(dataType) {
    const displayNames = {
      'account': 'Account Details - Platform, App & Infrastructure',
      'bench': 'Bench Report (August)',
      'certification': 'Certification Data (August)',
      'certification-july': 'App and Cloud Certification Data (July)',
      'certification-august': 'App and Cloud Certification Data (August)',
      'gt-allocation': "Graduate Trainee Allocation Details",
      'rrf': 'RRF - Request for Resources (September)',
      'rrf-july': 'RRF - Request for Resources (July)',
      'rrf-august': 'RRF - Request for Resources (August)', 
      'rrf-september': 'RRF - Request for Resources (September)',
      'utilization': 'Utilization Report'
    };
    
    return displayNames[dataType] || dataType;
  }

  /**
   * Get mock account data when blob fails (for demo purposes)
   * @returns {Object} Mock data result
   */
  getMockAccountData() {
    const mockData = [
      {
        'Employee ID': 'EMP001',
        'Full Name': 'John Smith',
        'Email': 'john.smith@company.com',
        'Department': 'Technology',
        'Role': 'Senior Developer',
        'Manager': 'Sarah Johnson',
        'Location': 'Hyderabad',
        'Joining Date': '2023-01-15',
        'Employee Status': 'Active'
      },
      {
        'Employee ID': 'EMP002',
        'Full Name': 'Priya Sharma',
        'Email': 'priya.sharma@company.com',
        'Department': 'Technology',
        'Role': 'Tech Lead',
        'Manager': 'Sarah Johnson',
        'Location': 'Bangalore',
        'Joining Date': '2022-06-10',
        'Employee Status': 'Active'
      },
      {
        'Employee ID': 'EMP003',
        'Full Name': 'Rajesh Kumar',
        'Email': 'rajesh.kumar@company.com',
        'Department': 'Technology',
        'Role': 'Full Stack Developer',
        'Manager': 'Mike Wilson',
        'Location': 'Chennai',
        'Joining Date': '2023-03-20',
        'Employee Status': 'Active'
      },
      {
        'Employee ID': 'EMP004',
        'Full Name': 'Lisa Anderson',
        'Email': 'lisa.anderson@company.com',
        'Department': 'Quality Assurance',
        'Role': 'QA Engineer',
        'Manager': 'David Brown',
        'Location': 'Pune',
        'Joining Date': '2023-08-05',
        'Employee Status': 'Active'
      }
    ];

    return {
      success: true,
      dataType: 'account',
      worksheetName: 'Platform, App & Infra',
      totalRows: mockData.length,
      data: mockData,
      blobUrl: `${this.baseStorageUrl}/Account Details/Platform, App & Infra.xlsx`,
      lastFetched: new Date().toISOString(),
      isMockData: true
    };
  }

  /**
   * Get available data types
   * @returns {Array} Available data types
   */
  getAvailableDataTypes() {
    return Object.keys(this.dataTypes).map(key => ({
      key,
      name: this.getDisplayName(key),
      filePath: this.dataTypes[key],
      blobUrl: `${this.baseStorageUrl}/${this.dataTypes[key]}`
    }));
  }
}

// Export singleton instance
const excelBlobService = new ExcelBlobService();
export default excelBlobService;