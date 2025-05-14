/* global console, Excel */

interface SheetData {
  name: string;
  data: any[][];
  usedRange: {
    address: string;
    rowCount: number;
    columnCount: number;
  };
}

export async function insertFormulaToActiveCell(formula: string): Promise<void> {
  await Excel.run(async (context) => {
    // Get the current active cell
    const range = context.workbook.getActiveCell();

    // Set the formula
    range.formulas = [[formula]];

    await context.sync();
  });
}

export async function getWorkbookSheets(): Promise<{ name: string; tabColor: any }[]> {
  return await Excel.run(async (context) => {
    const sheets = context.workbook.worksheets;
    sheets.load("items/name, items/tabColor");
    await context.sync();
    
    const sheetInfo = sheets.items.map(sheet => {
      return {
        name: sheet.name,
        tabColor: sheet.tabColor || 'No color'
      };
    });
    
    return sheetInfo;
  });
}

export async function getActiveSheetContent(): Promise<SheetData> {
  return await Excel.run(async (context) => {
    // Get the active worksheet
    const activeSheet = context.workbook.worksheets.getActiveWorksheet();
    activeSheet.load("name");
    
    // Get the used range of the worksheet
    const usedRange = activeSheet.getUsedRange();
    usedRange.load(["address", "rowCount", "columnCount", "values"]);
    
    await context.sync();
    
    // Create the sheet data object
    const sheetData: SheetData = {
      name: activeSheet.name,
      data: usedRange.values,
      usedRange: {
        address: usedRange.address,
        rowCount: usedRange.rowCount,
        columnCount: usedRange.columnCount
      }
    };
    
    return sheetData;
  });
}

export async function getActiveSheetContentAsJson(): Promise<string> {
  try {
    const sheetData = await getActiveSheetContent();
    
    // If there's data, try to convert it to a more structured format
    if (sheetData.data && sheetData.data.length > 0) {
      // Assume first row contains headers
      const headers = sheetData.data[0];
      const rows = [];
      
      // Start from row 1 (skip headers)
      for (let i = 1; i < sheetData.data.length; i++) {
        const row = sheetData.data[i];
        const rowObject = {};
        
        // Map each cell to its corresponding header
        for (let j = 0; j < headers.length; j++) {
          if (headers[j]) { // Only use non-empty headers
            rowObject[headers[j]] = row[j];
          }
        }
        
        rows.push(rowObject);
      }
      
      // Return both the raw data and the structured data
      const result = {
        sheetName: sheetData.name,
        usedRange: sheetData.usedRange,
        rawData: sheetData.data,
        structuredData: rows
      };
      
      return JSON.stringify(result, null, 2);
    }
    
    // If no structured conversion is possible, return the raw data
    return JSON.stringify(sheetData, null, 2);
  } catch (error) {
    console.error("Error getting sheet content as JSON:", error);
    throw new Error(`Failed to get sheet content: ${error.message}`);
  }
}
