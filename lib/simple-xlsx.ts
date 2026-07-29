import { strToU8, zipSync } from "fflate";

export interface SimpleXlsxFill {
  type: "pattern";
  pattern: "solid";
  fgColor: { argb: string };
}

interface BorderSide {
  style: "thin";
  color: { argb: string };
}

export interface SimpleXlsxBorders {
  top?: BorderSide;
  left?: BorderSide;
  bottom?: BorderSide;
  right?: BorderSide;
}

interface CellFont {
  bold?: boolean;
  italic?: boolean;
  color?: { argb: string };
  size?: number;
}

interface CellAlignment {
  horizontal?: "center" | "left" | "right";
  vertical?: "middle";
  wrapText?: boolean;
}

export class SimpleXlsxCell {
  value: string | number | null = null;
  font: CellFont = {};
  alignment: CellAlignment = {};
  fill?: SimpleXlsxFill;
  border: Partial<SimpleXlsxBorders> = {};
  numFmt?: string;

  constructor(
    readonly row: number,
    readonly column: number,
  ) {}
}

export class SimpleXlsxRow {
  height?: number;

  constructor(
    readonly number: number,
    private readonly worksheet: SimpleXlsxWorksheet,
  ) {}

  getCell(column: number): SimpleXlsxCell {
    return this.worksheet.getCell(this.number, column);
  }

  eachCell(callback: (cell: SimpleXlsxCell) => void) {
    for (const cell of this.worksheet.cellsInRow(this.number)) {
      callback(cell);
    }
  }
}

export class SimpleXlsxWorksheet {
  columns: Array<{ width?: number }> = [];
  readonly headerFooter: { oddFooter?: string } = {};
  private readonly cells = new Map<string, SimpleXlsxCell>();
  private readonly rows = new Map<number, SimpleXlsxRow>();
  private readonly mergedRanges: string[] = [];
  private lastRow = 0;

  constructor(readonly name: string) {}

  getCell(address: string): SimpleXlsxCell;
  getCell(row: number, column: number): SimpleXlsxCell;
  getCell(
    addressOrRow: string | number,
    optionalColumn?: number,
  ): SimpleXlsxCell {
    const [row, column] =
      typeof addressOrRow === "string"
        ? parseAddress(addressOrRow)
        : [addressOrRow, optionalColumn ?? 1];
    const key = `${row}:${column}`;
    let cell = this.cells.get(key);
    if (!cell) {
      cell = new SimpleXlsxCell(row, column);
      this.cells.set(key, cell);
    }
    this.lastRow = Math.max(this.lastRow, row);
    return cell;
  }

  getRow(number: number): SimpleXlsxRow {
    let row = this.rows.get(number);
    if (!row) {
      row = new SimpleXlsxRow(number, this);
      this.rows.set(number, row);
    }
    this.lastRow = Math.max(this.lastRow, number);
    return row;
  }

  addRow(values: Array<string | number | null>): SimpleXlsxRow {
    const row = this.getRow(this.lastRow + 1);
    values.forEach((value, index) => {
      row.getCell(index + 1).value = value;
    });
    return row;
  }

  mergeCells(range: string): void;
  mergeCells(
    startRow: number,
    startColumn: number,
    endRow: number,
    endColumn: number,
  ): void;
  mergeCells(
    rangeOrStartRow: string | number,
    startColumn?: number,
    endRow?: number,
    endColumn?: number,
  ) {
    const range =
      typeof rangeOrStartRow === "string"
        ? rangeOrStartRow
        : `${cellAddress(rangeOrStartRow, startColumn ?? 1)}:${cellAddress(
            endRow ?? rangeOrStartRow,
            endColumn ?? startColumn ?? 1,
          )}`;
    this.mergedRanges.push(range);
  }

  cellsInRow(row: number): SimpleXlsxCell[] {
    return [...this.cells.values()]
      .filter((cell) => cell.row === row)
      .sort((a, b) => a.column - b.column);
  }

  allCells(): SimpleXlsxCell[] {
    return [...this.cells.values()];
  }

  toXml(styles: StyleRegistry): string {
    const rowNumbers = new Set<number>([
      ...this.rows.keys(),
      ...[...this.cells.values()].map(({ row }) => row),
    ]);
    const rows = [...rowNumbers]
      .sort((a, b) => a - b)
      .map((number) => {
        const row = this.getRow(number);
        const cells = this.cellsInRow(number)
          .map((cell) => cellXml(cell, styles))
          .join("");
        const height = row.height
          ? ` ht="${row.height}" customHeight="1"`
          : "";
        return `<row r="${number}"${height}>${cells}</row>`;
      })
      .join("");
    const columns = this.columns
      .map(({ width }, index) =>
        width
          ? `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
          : "",
      )
      .join("");
    const mergeCells =
      this.mergedRanges.length > 0
        ? `<mergeCells count="${this.mergedRanges.length}">${this.mergedRanges
            .map((range) => `<mergeCell ref="${range}"/>`)
            .join("")}</mergeCells>`
        : "";

    return xmlDocument(
      `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        ${columns ? `<cols>${columns}</cols>` : ""}
        <sheetData>${rows}</sheetData>
        ${mergeCells}
        <pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
      </worksheet>`,
    );
  }
}

export class SimpleXlsxWorkbook {
  creator = "";
  created = new Date();
  modified = new Date();
  subject = "";
  title = "";
  readonly worksheets: SimpleXlsxWorksheet[] = [];
  readonly xlsx = {
    writeBuffer: async (): Promise<Uint8Array> => this.writeBuffer(),
  };

  addWorksheet(
    name: string,
    options?: unknown,
  ): SimpleXlsxWorksheet {
    void options;
    const worksheet = new SimpleXlsxWorksheet(name);
    this.worksheets.push(worksheet);
    return worksheet;
  }

  getWorksheet(name: string): SimpleXlsxWorksheet | undefined {
    return this.worksheets.find((worksheet) => worksheet.name === name);
  }

  private writeBuffer(): Uint8Array {
    const styles = new StyleRegistry();
    for (const worksheet of this.worksheets) {
      worksheet.allCells().forEach((cell) => styles.styleId(cell));
    }
    const files: Record<string, Uint8Array> = {
      "[Content_Types].xml": strToU8(contentTypes(this.worksheets.length)),
      "_rels/.rels": strToU8(rootRelationships()),
      "docProps/app.xml": strToU8(appProperties(this.worksheets)),
      "docProps/core.xml": strToU8(coreProperties(this)),
      "xl/workbook.xml": strToU8(workbookXml(this.worksheets)),
      "xl/_rels/workbook.xml.rels": strToU8(
        workbookRelationships(this.worksheets.length),
      ),
      "xl/styles.xml": strToU8(styles.toXml()),
    };
    this.worksheets.forEach((worksheet, index) => {
      files[`xl/worksheets/sheet${index + 1}.xml`] = strToU8(
        worksheet.toXml(styles),
      );
    });
    return zipSync(files, { level: 6 });
  }
}

class StyleRegistry {
  private readonly fonts = [defaultFont()];
  private readonly fills = [
    `<fill><patternFill patternType="none"/></fill>`,
    `<fill><patternFill patternType="gray125"/></fill>`,
  ];
  private readonly borders = [`<border/>`];
  private readonly styles = [
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>`,
  ];
  private readonly styleKeys = new Map<string, number>([["{}", 0]]);

  styleId(cell: SimpleXlsxCell): number {
    const specification = {
      font: cell.font,
      fill: cell.fill,
      border: cell.border,
      alignment: cell.alignment,
      numFmt: cell.numFmt,
    };
    const key = JSON.stringify(specification);
    const existing = this.styleKeys.get(key);
    if (existing !== undefined) return existing;

    const fontId = registerXml(this.fonts, fontXml(cell.font));
    const fillId = cell.fill
      ? registerXml(this.fills, fillXml(cell.fill))
      : 0;
    const borderId =
      Object.keys(cell.border).length > 0
        ? registerXml(this.borders, borderXml(cell.border))
        : 0;
    const numFmtId = cell.numFmt === "0.0%" ? 164 : 0;
    const alignment = alignmentXml(cell.alignment);
    const style =
      `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"` +
      `${numFmtId ? ' applyNumberFormat="1"' : ""}` +
      `${fontId ? ' applyFont="1"' : ""}` +
      `${fillId ? ' applyFill="1"' : ""}` +
      `${borderId ? ' applyBorder="1"' : ""}` +
      `${alignment ? ' applyAlignment="1"' : ""}>${alignment}</xf>`;
    const id = this.styles.length;
    this.styles.push(style);
    this.styleKeys.set(key, id);
    return id;
  }

  toXml(): string {
    return xmlDocument(
      `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <numFmts count="1"><numFmt numFmtId="164" formatCode="0.0%"/></numFmts>
        <fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>
        <fills count="${this.fills.length}">${this.fills.join("")}</fills>
        <borders count="${this.borders.length}">${this.borders.join("")}</borders>
        <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
        <cellXfs count="${this.styles.length}">${this.styles.join("")}</cellXfs>
        <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
      </styleSheet>`,
    );
  }
}

function cellXml(cell: SimpleXlsxCell, styles: StyleRegistry): string {
  const address = cellAddress(cell.row, cell.column);
  const style = styles.styleId(cell);
  if (typeof cell.value === "number") {
    return `<c r="${address}" s="${style}"><v>${cell.value}</v></c>`;
  }
  if (cell.value === null) return `<c r="${address}" s="${style}"/>`;
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(
    String(cell.value),
  )}</t></is></c>`;
}

function fontXml(font: CellFont): string {
  return `<font>${font.bold ? "<b/>" : ""}${font.italic ? "<i/>" : ""}<sz val="${
    font.size ?? 11
  }"/><color rgb="${argb(font.color?.argb ?? "000000")}"/><name val="Aptos"/></font>`;
}

function defaultFont(): string {
  return fontXml({ size: 11, color: { argb: "000000" } });
}

function fillXml(fill: SimpleXlsxFill): string {
  return `<fill><patternFill patternType="solid"><fgColor rgb="${argb(
    fill.fgColor.argb,
  )}"/><bgColor indexed="64"/></patternFill></fill>`;
}

function borderXml(border: Partial<SimpleXlsxBorders>): string {
  return `<border>${borderSideXml("left", border.left)}${borderSideXml(
    "right",
    border.right,
  )}${borderSideXml("top", border.top)}${borderSideXml(
    "bottom",
    border.bottom,
  )}<diagonal/></border>`;
}

function borderSideXml(name: string, side?: BorderSide): string {
  return side
    ? `<${name} style="${side.style}"><color rgb="${argb(
        side.color.argb,
      )}"/></${name}>`
    : `<${name}/>`;
}

function alignmentXml(alignment: CellAlignment): string {
  const attributes = [
    alignment.horizontal ? `horizontal="${alignment.horizontal}"` : "",
    alignment.vertical
      ? `vertical="${alignment.vertical === "middle" ? "center" : alignment.vertical}"`
      : "",
    alignment.wrapText ? 'wrapText="1"' : "",
  ].filter(Boolean);
  return attributes.length > 0
    ? `<alignment ${attributes.join(" ")}/>`
    : "";
}

function registerXml(collection: string[], xml: string): number {
  const existing = collection.indexOf(xml);
  if (existing >= 0) return existing;
  collection.push(xml);
  return collection.length - 1;
}

function contentTypes(sheetCount: number): string {
  return xmlDocument(
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
      <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
      <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
      ${Array.from(
        { length: sheetCount },
        (_, index) =>
          `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      ).join("")}
    </Types>`,
  );
}

function rootRelationships(): string {
  return xmlDocument(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
      <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
    </Relationships>`,
  );
}

function workbookXml(worksheets: SimpleXlsxWorksheet[]): string {
  return xmlDocument(
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets>${worksheets
        .map(
          ({ name }, index) =>
            `<sheet name="${escapeXml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`,
        )
        .join("")}</sheets>
    </workbook>`,
  );
}

function workbookRelationships(sheetCount: number): string {
  return xmlDocument(
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      ${Array.from(
        { length: sheetCount },
        (_, index) =>
          `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`,
      ).join("")}
      <Relationship Id="rId${sheetCount + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    </Relationships>`,
  );
}

function appProperties(worksheets: SimpleXlsxWorksheet[]): string {
  return xmlDocument(
    `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
      <Application>SGR-EG</Application>
      <TitlesOfParts><vt:vector size="${worksheets.length}" baseType="lpstr">${worksheets
        .map(({ name }) => `<vt:lpstr>${escapeXml(name)}</vt:lpstr>`)
        .join("")}</vt:vector></TitlesOfParts>
    </Properties>`,
  );
}

function coreProperties(workbook: SimpleXlsxWorkbook): string {
  return xmlDocument(
    `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
      <dc:title>${escapeXml(workbook.title)}</dc:title>
      <dc:subject>${escapeXml(workbook.subject)}</dc:subject>
      <dc:creator>${escapeXml(workbook.creator)}</dc:creator>
      <dcterms:created xsi:type="dcterms:W3CDTF">${workbook.created.toISOString()}</dcterms:created>
      <dcterms:modified xsi:type="dcterms:W3CDTF">${workbook.modified.toISOString()}</dcterms:modified>
    </cp:coreProperties>`,
  );
}

function parseAddress(address: string): [number, number] {
  const match = /^([A-Z]+)(\d+)$/i.exec(address);
  if (!match) throw new Error(`Dirección XLSX inválida: ${address}`);
  let column = 0;
  for (const character of match[1].toUpperCase()) {
    column = column * 26 + character.charCodeAt(0) - 64;
  }
  return [Number(match[2]), column];
}

function cellAddress(row: number, column: number): string {
  let current = column;
  let letters = "";
  while (current > 0) {
    const remainder = (current - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    current = Math.floor((current - 1) / 26);
  }
  return `${letters}${row}`;
}

function xmlDocument(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${content}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function argb(value: string): string {
  const normalized = value.replace("#", "").toUpperCase();
  return normalized.length === 8 ? normalized : `FF${normalized}`;
}
