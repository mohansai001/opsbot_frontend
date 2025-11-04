import * as XLSX from 'xlsx';

class DirectBlobService {
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
   * Fetch Excel data using browser-native methods
   * Since the URL works in browser, try alternative approaches
   */
  async fetchExcelDataDirect(dataType) {
    try {
      console.log(`📊 Fetching ${dataType} data using direct browser methods...`);
      
      const filePath = this.dataTypes[dataType];
      if (!filePath) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Properly encode the URL
      const encodedFilePath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
      const blobUrl = `${this.baseStorageUrl}/${encodedFilePath}`;
      console.log(`🔗 Direct Blob URL: ${blobUrl}`);

      // Method 1: Try XMLHttpRequest (sometimes works when fetch doesn't)
      const data = await this.fetchWithXHR(blobUrl);
      
      if (data) {
        // Parse the Excel file
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        const processedData = this.processExcelData(rawData, dataType);

        console.log(`✅ Successfully fetched ${processedData.length} rows via direct method`);

        return {
          success: true,
          dataType: dataType,
          worksheetName: worksheetName,
          totalRows: processedData.length,
          data: processedData,
          blobUrl: blobUrl,
          lastFetched: new Date().toISOString(),
          isMockData: false,
          fetchMethod: 'XMLHttpRequest'
        };
      }

      throw new Error('All direct methods failed');

    } catch (error) {
      console.error(`❌ Failed to fetch ${dataType} data via direct methods:`, error);
      return {
        success: false,
        error: error.message,
        dataType: dataType,
        lastAttempted: new Date().toISOString()
      };
    }
  }

  /**
   * Fetch using XMLHttpRequest (sometimes bypasses CORS issues)
   */
  fetchWithXHR(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Configure XHR
      xhr.open('GET', url, true);
      xhr.responseType = 'arraybuffer';
      xhr.timeout = 30000; // 30 seconds
      
      // Handle success
      xhr.onload = function() {
        if (xhr.status === 200 || xhr.status === 0) { // 0 for local/file URLs
          console.log('✅ XHR fetch successful');
          resolve(new Uint8Array(xhr.response));
        } else {
          reject(new Error(`XHR failed with status: ${xhr.status}`));
        }
      };
      
      // Handle errors
      xhr.onerror = function() {
        reject(new Error('XHR network error'));
      };
      
      xhr.ontimeout = function() {
        reject(new Error('XHR request timeout'));
      };
      
      // Send request
      console.log('🔄 Sending XHR request...');
      xhr.send();
    });
  }

  /**
   * Alternative: Create a download link and simulate click
   * This leverages the browser's ability to download the file
   */
  async fetchViaDownloadLink(url) {
    return new Promise((resolve, reject) => {
      // Create a temporary link element
      const link = document.createElement('a');
      link.href = url;
      link.download = 'temp-excel-file.xlsx';
      link.style.display = 'none';
      
      // Add to DOM temporarily
      document.body.appendChild(link);
      
      // Set up file reading
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.xlsx,.xls';
      input.style.display = 'none';
      
      input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(new Uint8Array(e.target.result));
          };
          reader.onerror = () => reject(new Error('File read error'));
          reader.readAsArrayBuffer(file);
        } else {
          reject(new Error('No file selected'));
        }
        
        // Cleanup
        document.body.removeChild(input);
        document.body.removeChild(link);
      };
      
      // Simulate click to download
      link.click();
      
      // Fallback: ask user to select the downloaded file
      setTimeout(() => {
        document.body.appendChild(input);
        input.click();
      }, 1000);
    });
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
            <p>Source: ${fetchResult.worksheetName} | ${data.length} records (Live Data via ${fetchResult.fetchMethod})</p>
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
}

// Export singleton instance
const directBlobService = new DirectBlobService();
export default directBlobService;