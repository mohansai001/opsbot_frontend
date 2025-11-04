import * as XLSX from 'xlsx';

class RealDataService {
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
   * Fetch real Excel data using browser download mechanism
   * @param {string} dataType - Type of data to fetch
   * @returns {Promise<Object>} Parsed Excel data
   */
  async fetchRealExcelData(dataType) {
    try {
      console.log(`📊 Fetching REAL ${dataType} data from Azure Blob Storage...`);
      
      const filePath = this.dataTypes[dataType];
      if (!filePath) {
        throw new Error(`Unknown data type: ${dataType}`);
      }

      // Properly encode the URL
      const encodedFilePath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
      const blobUrl = `${this.baseStorageUrl}/${encodedFilePath}`;
      console.log(`🔗 Real Data URL: ${blobUrl}`);

      // Method: Use a hidden iframe to download the file, then read it
      const excelData = await this.downloadAndReadExcel(blobUrl, dataType);
      
      if (excelData) {
        console.log(`✅ Successfully fetched REAL ${dataType} data!`);
        return {
          success: true,
          dataType: dataType,
          worksheetName: excelData.worksheetName,
          totalRows: excelData.data.length,
          data: excelData.data,
          blobUrl: blobUrl,
          lastFetched: new Date().toISOString(),
          isMockData: false,
          fetchMethod: 'Browser Download'
        };
      }

      throw new Error('Failed to download and read Excel file');

    } catch (error) {
      console.error(`❌ Failed to fetch REAL ${dataType} data:`, error);
      return {
        success: false,
        error: error.message,
        dataType: dataType,
        lastAttempted: new Date().toISOString()
      };
    }
  }

  /**
   * Download Excel file using browser and read it
   * @param {string} url - Excel file URL
   * @param {string} dataType - Data type
   * @returns {Promise<Object>} Excel data
   */
  async downloadAndReadExcel(url, dataType) {
    return new Promise((resolve, reject) => {
      console.log('🔄 Creating download mechanism for real Excel data...');
      
      // Create a temporary file input to trigger file selection
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.xlsx,.xls';
      fileInput.style.display = 'none';
      
      // Show user instructions
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `${dataType}-data.xlsx`;
      downloadLink.target = '_blank';
      downloadLink.style.display = 'none';
      
      document.body.appendChild(downloadLink);
      document.body.appendChild(fileInput);
      
      // Set up file reading when user selects the downloaded file
      fileInput.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
          try {
            console.log(`📁 Reading selected Excel file: ${file.name}`);
            const arrayBuffer = await file.arrayBuffer();
            
            // Parse Excel file
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const worksheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[worksheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            
            const processedData = this.processExcelData(rawData, dataType);
            
            resolve({
              worksheetName: worksheetName,
              data: processedData
            });
          } catch (error) {
            reject(new Error(`Failed to read Excel file: ${error.message}`));
          }
        } else {
          reject(new Error('No file was selected'));
        }
        
        // Cleanup
        document.body.removeChild(fileInput);
        document.body.removeChild(downloadLink);
      };
      
      // Show modal to user asking them to download and select the file
      this.showDownloadModal(url, dataType, () => {
        fileInput.click();
      }, () => {
        reject(new Error('User cancelled download'));
        document.body.removeChild(fileInput);
        document.body.removeChild(downloadLink);
      });
    });
  }

  /**
   * Show modal to user for downloading the Excel file
   * @param {string} url - Download URL
   * @param {string} dataType - Data type
   * @param {Function} onFileSelect - Callback when user should select file
   * @param {Function} onCancel - Callback when user cancels
   */
  showDownloadModal(url, dataType, onFileSelect, onCancel) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: Arial, sans-serif;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    modalContent.innerHTML = `
      <h3>📊 Load Real Excel Data</h3>
      <p>To display your actual <strong>${dataType}</strong> data, please:</p>
      <ol style="text-align: left; margin: 20px 0;">
        <li>Click "Download Excel File" to download the file</li>
        <li>Wait for the download to complete</li>
        <li>Click "Select Downloaded File" and choose the downloaded Excel file</li>
      </ol>
      <div style="margin: 20px 0;">
        <button id="downloadBtn" style="
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 5px;
          border-radius: 5px;
          cursor: pointer;
        ">📥 Download Excel File</button>
        <button id="selectBtn" style="
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          margin: 5px;
          border-radius: 5px;
          cursor: pointer;
        ">📁 Select Downloaded File</button>
      </div>
      <button id="cancelBtn" style="
        background: #dc3545;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 5px;
        cursor: pointer;
      ">Cancel</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('downloadBtn').onclick = () => {
      window.open(url, '_blank');
    };
    
    document.getElementById('selectBtn').onclick = () => {
      document.body.removeChild(modal);
      onFileSelect();
    };
    
    document.getElementById('cancelBtn').onclick = () => {
      document.body.removeChild(modal);
      onCancel();
    };
    
    // Close on outside click
    modal.onclick = (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
        onCancel();
      }
    };
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
   * @param {*} value - Cell value
   * @returns {string} Formatted value
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
   * @param {Object} fetchResult - Fetch result object
   * @returns {string} HTML table string
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
            <h3>📊 ${this.getDisplayName(fetchResult.dataType)} - REAL DATA</h3>
            <p>Source: ${fetchResult.worksheetName} | ${data.length} records (Live Data from Azure Blob Storage)</p>
          </div>
          <div class="excel-meta">
            <span class="fetch-time">Last updated: ${new Date(fetchResult.lastFetched).toLocaleString()}</span>
            <span class="data-source">Method: ${fetchResult.fetchMethod}</span>
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
    const tableId = `real-excel-table-${Date.now()}`;
    
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
      </div>
    `;

    return html;
  }

  /**
   * Format header names
   * @param {string} header - Header string
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
}

// Export singleton instance
const realDataService = new RealDataService();
export default realDataService;