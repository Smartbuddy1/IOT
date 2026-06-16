import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToPDF = (title, columns, rows) => {
  try {
    const doc = new jsPDF();
    doc.text(title, 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

    const safeRows = rows.map(row => row.map(cell => cell ? cell.toString() : '-'));

    if (typeof autoTable === 'function') {
      autoTable(doc, {
        head: [columns],
        body: safeRows,
        startY: 28,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] }
      });
    } else if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        head: [columns],
        body: safeRows,
        startY: 28,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [15, 23, 42] }
      });
    } else {
      alert("PDF library is not fully loaded. Please wait a second and try again.");
      return;
    }
    
    doc.save(`${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    window.open(doc.output('bloburl'), '_blank');
  } catch (error) {
    console.error("PDF Generation Error: ", error);
    alert("Error generating PDF: " + error.message);
  }
};

export const exportToExcel = (title, columns, rows) => {
  try {
    // Basic CSV format
    const safeRows = rows.map(row => 
      row.map(cell => `"${(cell ? cell.toString() : '-').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [columns.join(','), ...safeRows].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Excel Generation Error: ", error);
    alert("Error generating Excel file: " + error.message);
  }
};

export const handlePrint = () => {
  window.print();
};
