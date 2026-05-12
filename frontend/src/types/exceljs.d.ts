// Minimal type declaration for dynamic import of exceljs
export interface ExcelJSModule {
  Workbook: any
  Worksheet: any
}

declare module "exceljs" {
  export interface Workbook {
    addWorksheet(name: string): any
    xlsx: any
  }
  export class Workbook implements Workbook {
    addWorksheet(name: string): any
    xlsx: any
  }
}
