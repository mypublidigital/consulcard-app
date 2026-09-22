// Tipos mínimos para pdfmake 0.3 (o pacote não traz tipos, e @types/pdfmake
// descreve a 0.2, cuja API é outra: callbacks e vfs em vez de promises e
// addVirtualFileSystem).
declare module "pdfmake/build/pdfmake" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DocDefinition = Record<string, any>;
  interface PdfDocument {
    getBlob(): Promise<Blob>;
  }
  const pdfMake: {
    addVirtualFileSystem(vfs: Record<string, string>): void;
    createPdf(doc: DocDefinition): PdfDocument;
  };
  export default pdfMake;
}

declare module "pdfmake/build/vfs_fonts" {
  const vfs: Record<string, string>;
  export default vfs;
}
