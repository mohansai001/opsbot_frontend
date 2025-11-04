import axios from 'axios';
import * as XLSX from 'xlsx';

class ExcelProxyService {
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
   * Fetch Excel data using CORS proxy
   * @param {string} dataType - Type of data to fetch
   * @returns {Promise<Object>} Parsed Excel data
   */
  async fetchExcelDataWithProxy(dataType) {
    try {
      console.log(`📊 Fetching ${dataType} data via CORS proxy...`);
      
      const filePath = this.dataTypes[dataType];
      if (!filePath) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Properly encode the URL
      const encodedFilePath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
      const blobUrl = `${this.baseStorageUrl}/${encodedFilePath}`;
      
      // Use CORS proxy services
      const proxyUrls = [
        `https://cors-anywhere.herokuapp.com/${blobUrl}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(blobUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(blobUrl)}`
      ];

      let lastError;
      
      // Try each proxy service
      for (const proxyUrl of proxyUrls) {
        try {
          console.log(`🔗 Trying proxy: ${proxyUrl}`);
          
          const response = await axios.get(proxyUrl, {
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
              'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }
          });

          if (response.status === 200 && response.data) {
            // Parse the Excel file
            const workbook = XLSX.read(response.data, { type: 'array' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

            const processedData = this.processExcelData(rawData, dataType);

            return {
              success: true,
              dataType: dataType,
              worksheetName: worksheetName,
              totalRows: processedData.length,
              data: processedData,
              blobUrl: blobUrl,
              proxyUrl: proxyUrl,
              lastFetched: new Date().toISOString(),
              isMockData: false
            };
          }
        } catch (error) {
          console.log(`❌ Proxy ${proxyUrl} failed:`, error.message);
          lastError = error;
          continue;
        }
      }
      
      throw lastError || new Error('All proxy services failed');
      
    } catch (error) {
      console.error(`❌ Failed to fetch ${dataType} data via proxy:`, error);
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
        const rowData = { _rowIndex: index + 2 };
        
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
   * Format cell values
   */
  formatCellValue(value) {
    if (value === null || value === undefined || value === '') {
      return '-';
    }
    
    if (typeof value === 'number') {
      // Handle dates (Excel stores dates as numbers)
      if (value > 40000 && value < 50000) { // Rough range for recent dates
        try {
          const date = new Date((value - 25569) * 86400 * 1000);
          return date.toLocaleDateString();
        } catch (e) {
          return value;
        }
      }
      return value;
    }
    
    return String(value).trim();
  }

  /**
   * Generate HTML table from Excel data
   */
  generateHtmlTable(fetchResult) {
    const { data, dataType, worksheetName } = fetchResult;
    
    if (!data || data.length === 0) {
      return '<div class="excel-data-container"><p>No data available</p></div>';
    }

    const headers = Object.keys(data[0]).filter(key => key !== '_rowIndex');
    
    let html = `
      <div class="excel-data-container">
        <div class="excel-header">
          <div class="excel-title">
            <h3>📊 ${this.getDisplayName(fetchResult.dataType)}</h3>
            <p>Source: ${fetchResult.worksheetName} | ${data.length} records ${fetchResult.isMockData ? '(Demo Data)' : '(Live Data via Proxy)'}</p>
          </div>
          <div class="excel-meta">
            <span class="fetch-time">Last updated: ${new Date(fetchResult.lastFetched).toLocaleString()}</span>
            ${fetchResult.proxyUrl ? `<span class="proxy-info">Via: ${fetchResult.proxyUrl.split('/')[2]}</span>` : ''}
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

    // Display all rows
    data.forEach(row => {
      html += '<tr>';
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
      </div>
    `;

    return html;
  }

  /**
   * Format header names
   */
  formatHeaderName(header) {
    return header
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Get display name for data type
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
   * Get mock data fallback (same as original service)
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
}

// Export singleton instance
const excelProxyService = new ExcelProxyService();
export default excelProxyService;