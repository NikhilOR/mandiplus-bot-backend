const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const INVOICES_DIR = path.join(__dirname, '../../invoices'); // backend/invoices
const DEFAULT_HSN = '08011910';

const COMPANY_NAME = process.env.INVOICE_COMPANY_NAME || 'ENP FARMS PVT LTD';
const COMPANY_ADDRESS = process.env.INVOICE_COMPANY_ADDRESS || '# 51/4, Glass Factory Layout, Anandapur, Electronic City, Karnataka 560099';
const CLAIM_EMAIL = process.env.INVOICE_CLAIM_EMAIL || 'support@mandiplus.com';
const CLAIM_PHONE = process.env.INVOICE_CLAIM_PHONE || '+91 99001 86757';

function ensureInvoicesDir() {
  if (!fs.existsSync(INVOICES_DIR)) {
    fs.mkdirSync(INVOICES_DIR, { recursive: true });
  }
}

function formatDate(d) {
  const date = d instanceof Date ? d : new Date(d);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrency(amount) {
  return `Rs. ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Helper function to draw rounded rectangle
function drawRoundedRect(doc, x, y, width, height, radius) {
  doc.roundedRect(x, y, width, height, radius);
}

/**
 * Download image from URL and save to temp directory
 * @param {string} imageUrl - URL of the image
 * @returns {Promise<string|null>} - Local path to downloaded image or null
 */
async function downloadImageFromUrl(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return null;
  }

  try {
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileName = `kanta_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    const filePath = path.join(tempDir, fileName);

    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'stream',
      timeout: 10000, // 10 seconds timeout
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('❌ Failed to download image from URL:', error.message);
    return null;
  }
}

/**
 * Clean up temporary image file
 * @param {string} filePath - Path to temp file
 */
function cleanupTempImage(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log('🗑️  Cleaned up temp image:', filePath);
    } catch (err) {
      console.warn('⚠️  Failed to cleanup temp image:', err.message);
    }
  }
}

/**
 * Generate invoice PDF for an approved request. Saves to invoices/<invoiceNumber>.pdf
 * @param {Object} request - InsuranceRequest
 * @param {string} invoiceNumber - e.g. INV-2026-000364
 * @param {number} premiumAmount - Insurance amount (0.2% of total)
 * @returns {Promise<string>} - Filename or null on failure
 */
async function generateInvoicePdf(request, invoiceNumber, premiumAmount) {
  ensureInvoicesDir();
  const filename = `${invoiceNumber}.pdf`;
  const filepath = path.join(INVOICES_DIR, filename);

  const quantity = Number(request.quantity);
  const rate = Number(request.rate || 0);
  const totalAmount = quantity * rate;
  const supplierName = request.supplierName || '-';
  const supplierPlace = request.supplierPlace || '-';
  const partyName = request.partyName || '-';
  const partyAddress = request.partyAddress || '-';
  const vehicleNo = request.vehicleNo || '-';
  const transporterName = request.transporterName || '-';
  const itemName = request.itemName || '-';

  // Download Kanta Parchi image from URL if available
  let downloadedImagePath = null;
  if (request.kantaParchiImage) {
    console.log('📥 Attempting to download Kanta Parchi image from:', request.kantaParchiImage);
    downloadedImagePath = await downloadImageFromUrl(request.kantaParchiImage);
    if (downloadedImagePath) {
      console.log('✅ Kanta Parchi image downloaded to:', downloadedImagePath);
    }
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      margin: 30, 
      size: 'A4',
      bufferPages: true
    });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);

    stream.on('finish', () => {
      // Cleanup temp image after PDF is generated
      if (downloadedImagePath) {
        cleanupTempImage(downloadedImagePath);
      }
      resolve(filename);
    });
    
    stream.on('error', (err) => {
      if (downloadedImagePath) {
        cleanupTempImage(downloadedImagePath);
      }
      reject(err);
    });
    
    doc.on('error', (err) => {
      if (downloadedImagePath) {
        cleanupTempImage(downloadedImagePath);
      }
      reject(err);
    });

    try {
      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 30;
      const contentWidth = pageWidth - (margin * 2);
      const leftColWidth = (contentWidth / 2) - 10;
      const rightColWidth = (contentWidth / 2) - 10;
      const leftColX = margin;
      const rightColX = margin + leftColWidth + 20;

      // ============ HEADER WITH MANDIPLUS BRANDING ============
      let currentY = 35;
      
      // MandiPlus text with purple color
      doc.fontSize(18).font('Helvetica-Bold');
      doc.fillColor('#000000').text('Mandi', leftColX, currentY, { continued: true });
      doc.fillColor('#7C3AED').text('Plus', { continued: false });
      
      currentY += 25;

      // Company name and address
      doc.fillColor('#000000').fontSize(10).font('Helvetica-Bold');
      doc.text(COMPANY_NAME, leftColX, currentY);
      currentY += 13;
      doc.fontSize(8).font('Helvetica');
      doc.text(COMPANY_ADDRESS, leftColX, currentY, { width: contentWidth * 0.75 });
      
      // Draw horizontal line
      currentY += 20;
      doc.moveTo(leftColX, currentY).lineTo(pageWidth - margin, currentY).stroke();
      
      // INVOICE title in box (right side)
      const invoiceBoxX = pageWidth - margin - 140;
      const invoiceBoxY = 50;
      drawRoundedRect(doc, invoiceBoxX, invoiceBoxY, 140, 32, 5);
      doc.stroke();
      doc.fontSize(14).font('Helvetica-Bold');
      doc.text('INVOICE', invoiceBoxX, invoiceBoxY + 9, { width: 140, align: 'center' });

      currentY += 15;

      // ============ INVOICE DETAILS & SUPPLIER INFO BOXES ============
      const boxHeight = 75;
      
      // Left box - Invoice Details
      drawRoundedRect(doc, leftColX, currentY, leftColWidth, boxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Invoice Number', leftColX + 12, currentY + 12, { continued: true });
      doc.font('Helvetica').text(` : ${invoiceNumber}`, { continued: false });
      
      doc.font('Helvetica-Bold').text('Invoice Date', leftColX + 12, currentY + 30, { continued: true });
      doc.font('Helvetica').text(` : ${formatDate(new Date())}`, { continued: false });
      
      doc.font('Helvetica-Bold').text('Terms', leftColX + 12, currentY + 48, { continued: true });
      doc.font('Helvetica').text(' : CUSTOM', { continued: false });

      // Right box - Supplier Details
      drawRoundedRect(doc, rightColX, currentY, rightColWidth, boxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Supplier Name', rightColX + 12, currentY + 12, { continued: true });
      doc.font('Helvetica').text(` : ${supplierName}`, { width: rightColWidth - 25, continued: false });
      
      doc.font('Helvetica-Bold').text('Place of Supply', rightColX + 12, currentY + 38, { continued: true });
      doc.font('Helvetica').text(` : ${supplierPlace}`, { width: rightColWidth - 25, continued: false });

      currentY += boxHeight + 15;

      // ============ BILL TO & SHIP TO BOXES ============
      const addressBoxHeight = 85;
      
      // Bill To Box
      drawRoundedRect(doc, leftColX, currentY, leftColWidth, addressBoxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Bill To', leftColX + 12, currentY + 12);
      doc.fontSize(9).font('Helvetica');
      doc.text(partyName, leftColX + 12, currentY + 28, { width: leftColWidth - 24 });
      doc.text(partyAddress, leftColX + 12, currentY + 42, { width: leftColWidth - 24 });

      // Ship To Box
      drawRoundedRect(doc, rightColX, currentY, rightColWidth, addressBoxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Ship To', rightColX + 12, currentY + 12);
      doc.fontSize(9).font('Helvetica');
      doc.text(partyName, rightColX + 12, currentY + 28, { width: rightColWidth - 24 });
      doc.text(partyAddress, rightColX + 12, currentY + 42, { width: rightColWidth - 24 });

      currentY += addressBoxHeight + 15;

      // ============ ITEMS TABLE ============
      const tableX = leftColX;
      const tableWidth = contentWidth;
      
      const colHash = { x: tableX + 5, width: 20 };
      const colItem = { x: tableX + 30, width: 155 };
      const colHSN = { x: tableX + 190, width: 65 };
      const colQty = { x: tableX + 260, width: 65 };
      const colRate = { x: tableX + 330, width: 85 };
      const colAmount = { x: tableX + 420, width: 110 };
      
      // Table header
      doc.rect(tableX, currentY, tableWidth, 25).fillAndStroke('#E5E7EB', '#000000');
      
      doc.fillColor('#000000').fontSize(9).font('Helvetica-Bold');
      doc.text('#', colHash.x, currentY + 8, { width: colHash.width });
      doc.text('Item & Description', colItem.x, currentY + 8, { width: colItem.width });
      doc.text('HSN/SAC', colHSN.x, currentY + 8, { width: colHSN.width });
      doc.text('Qty', colQty.x, currentY + 8, { width: colQty.width, align: 'center' });
      doc.text('Rate', colRate.x, currentY + 8, { width: colRate.width, align: 'right' });
      doc.text('Amount', colAmount.x, currentY + 8, { width: colAmount.width, align: 'right' });

      currentY += 25;

      // Table row
      doc.rect(tableX, currentY, tableWidth, 35).stroke();
      
      doc.fontSize(9).font('Helvetica');
      doc.text('1', colHash.x, currentY + 10, { width: colHash.width });
      doc.text(itemName, colItem.x, currentY + 10, { width: colItem.width });
      doc.text(DEFAULT_HSN, colHSN.x, currentY + 10, { width: colHSN.width });
      doc.text(quantity.toLocaleString('en-IN'), colQty.x, currentY + 10, { width: colQty.width, align: 'center' });
      doc.text(formatCurrency(rate), colRate.x, currentY + 10, { width: colRate.width, align: 'right' });
      doc.text(formatCurrency(totalAmount), colAmount.x, currentY + 10, { width: colAmount.width, align: 'right' });

      currentY += 40;

      // ============ NOTES & TOTALS SECTION ============
      const notesBoxHeight = 115;
      
      // Notes Box (Left)
      drawRoundedRect(doc, leftColX, currentY, leftColWidth, notesBoxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Notes', leftColX + 12, currentY + 12);
      
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(`Vehicle No : ${vehicleNo}`, leftColX + 12, currentY + 28);
      doc.text(`Transporter Name : ${transporterName}`, leftColX + 12, currentY + 42);
      
      doc.font('Helvetica').fontSize(8);
      const noteText = `This vehicle is transporting ${itemName} from Supplier: ${supplierName} to Buyer: ${partyName}.`;
      doc.text(noteText, leftColX + 12, currentY + 58, { width: leftColWidth - 24, align: 'left' });
      
      const insuranceText = `In case of any accident, loss, or damage during transit, ${partyName} shall be treated as the insured person and will be entitled to receive all claim amounts for the damaged goods.`;
      doc.text(insuranceText, leftColX + 12, currentY + 78, { width: leftColWidth - 24, align: 'left' });

      // Totals Box (Right)
      drawRoundedRect(doc, rightColX, currentY, rightColWidth, notesBoxHeight, 5);
      doc.stroke();
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Total', rightColX + 12, currentY + 28);
      doc.text(formatCurrency(totalAmount), rightColX + 12, currentY + 46, { width: rightColWidth - 24, align: 'left' });
      
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Insurance Amount (0.2%)', rightColX + 12, currentY + 68);
      doc.text(formatCurrency(premiumAmount), rightColX + 12, currentY + 86, { width: rightColWidth - 24, align: 'left' });

      currentY += notesBoxHeight + 15;

      // ============ WEIGHTMENT SLIP & INSURANCE TERMS ============
      const bottomBoxHeight = 240; // Increased height for better spacing
      
      // Weightment Slip Box (Left)
      drawRoundedRect(doc, leftColX, currentY, leftColWidth, bottomBoxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Weightment Slip', leftColX + 12, currentY + 12);
      
      // Try to add Kanta Parchi image
      let imageAdded = false;
      
      // First try downloaded image from URL
      if (downloadedImagePath && fs.existsSync(downloadedImagePath)) {
        try {
          const imageHeight = bottomBoxHeight - 40;
          const imageY = currentY + 30;
          
          doc.image(downloadedImagePath, leftColX + 12, imageY, { 
            fit: [leftColWidth - 24, imageHeight],
            align: 'center',
            valign: 'center'
          });
          imageAdded = true;
          console.log('✅ Kanta Parchi image added from downloaded URL');
        } catch (err) {
          console.warn('⚠️ Failed to add downloaded image:', err.message);
        }
      }
      
      // Fallback: Try local file paths
      if (!imageAdded) {
        const possibleImagePaths = [
          path.join(__dirname, '../../uploads', request.kantaParchiImage || ''),
          path.join(__dirname, '../../uploads/kantaparchi', `${request.id}.jpg`),
          path.join(__dirname, '../../uploads/kantaparchi', `${request.id}.png`),
          path.join(__dirname, '../../uploads/kantaparchi', `${request.userId}.jpg`),
          path.join(__dirname, '../../uploads/kantaparchi', `${request.userId}.png`),
        ];
        
        for (const imagePath of possibleImagePaths) {
          if (fs.existsSync(imagePath)) {
            try {
              const imageHeight = bottomBoxHeight - 40;
              const imageY = currentY + 30;
              
              doc.image(imagePath, leftColX + 12, imageY, { 
                fit: [leftColWidth - 24, imageHeight],
                align: 'center',
                valign: 'center'
              });
              imageAdded = true;
              console.log(`✅ Kanta Parchi image added from local: ${imagePath}`);
              break;
            } catch (err) {
              console.warn(`⚠️ Failed to add image from ${imagePath}:`, err.message);
            }
          }
        }
      }
      
      // If still no image, show placeholder
      if (!imageAdded) {
        doc.fontSize(10).font('Helvetica');
        doc.text('CUSTOMER WILL UPDATE TOMORROW', leftColX + 12, currentY + (bottomBoxHeight / 2), { 
          width: leftColWidth - 24, 
          align: 'center' 
        });
        console.warn('⚠️ No Kanta Parchi image found, showing placeholder');
      }

      // Insurance Terms Box (Right) - IMPROVED FORMATTING
      drawRoundedRect(doc, rightColX, currentY, rightColWidth, bottomBoxHeight, 5);
      doc.stroke();
      
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Insurance Terms and Conditions', rightColX + 12, currentY + 12);
      
      let termsY = currentY + 28;
      const termsWidth = rightColWidth - 24;
      const lineHeight = 8.5; // Consistent line height
      
      // Section 1
      doc.fontSize(7.5).font('Helvetica-Bold');
      doc.text('1. Scope of Claim Eligibility:', rightColX + 12, termsY, { width: termsWidth });
      termsY += lineHeight + 2;
      
      doc.font('Helvetica').fontSize(7);
      const claims = [
        '• Vehicle accident, collision, or overturning during transit.',
        '• Theft, hijacking, or unlawful removal of cargo.',
        '• Shortage: Claims only when difference exceeds 2 Tons.',
        '• Loss due to strikes, riots, or civil commotion.',
        '• Damage from weather or natural calamities.',
        '• Fire, explosion, or related perils.',
        '• Loss due to driver fraud or negligence.'
      ];
      
      claims.forEach(claim => {
        doc.text(claim, rightColX + 12, termsY, { width: termsWidth });
        termsY += lineHeight;
      });

      termsY += 3;
      
      // Section 2
      doc.fontSize(7.5).font('Helvetica-Bold');
      doc.text('2. Mandatory Documentation:', rightColX + 12, termsY, { width: termsWidth });
      termsY += lineHeight + 2;
      
      doc.font('Helvetica').fontSize(7);
      const docs = [
        '• Photos/videos of damaged goods or incident.',
        '• FIR copy and original Invoice.',
        '• Damage Certificate and Letter of Subrogation.',
        '• Insurance Certificate and Proof of Delivery (POD).'
      ];
      
      docs.forEach(docItem => {
        doc.text(docItem, rightColX + 12, termsY, { width: termsWidth });
        termsY += lineHeight;
      });

      termsY += 3;
      
      // Section 3
      doc.fontSize(7.5).font('Helvetica-Bold');
      doc.text('3. Dispute Resolution & Communication:', rightColX + 12, termsY, { width: termsWidth });
      termsY += lineHeight + 2;
      
      doc.font('Helvetica').fontSize(7);
      doc.text(`All claims must be communicated via:`, rightColX + 12, termsY, { width: termsWidth });
      termsY += lineHeight;
      doc.text(`Email: ${CLAIM_EMAIL}`, rightColX + 12, termsY, { width: termsWidth });
      termsY += lineHeight;
      doc.text(`Phone: ${CLAIM_PHONE}`, rightColX + 12, termsY, { width: termsWidth });

      doc.end();
    } catch (err) {
      doc.end();
      if (downloadedImagePath) {
        cleanupTempImage(downloadedImagePath);
      }
      reject(err);
    }
  });
}

module.exports = {
  generateInvoicePdf,
  INVOICES_DIR,
};