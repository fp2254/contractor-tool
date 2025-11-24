// Invoice template styles for TradeBase
const INVOICE_TEMPLATES = {
  basic_clean: {
    name: "Basic Clean",
    description: "Black and white, classic contractor PDF"
  },
  modern_pro: {
    name: "Modern Pro",
    description: "Bold headings, clean sections"
  },
  color_accent: {
    name: "Color Accent Header",
    description: "Blue or gray header for official look"
  },
  big_total: {
    name: "Big Total",
    description: "Emphasizes the total amount"
  }
};

let currentTemplate = localStorage.getItem('tradebase-template') || 'basic_clean';

function setTemplate(templateId) {
  if (INVOICE_TEMPLATES[templateId]) {
    currentTemplate = templateId;
    localStorage.setItem('tradebase-template', templateId);
    return true;
  }
  return false;
}

function renderInvoiceTemplate(invoiceData, isQuote = false) {
  const template = document.getElementById('invoice-template');
  template.innerHTML = '';
  
  const type = isQuote ? 'QUOTE' : 'INVOICE';
  const numberField = isQuote ? 'quote_number' : 'number';
  const dateField = isQuote ? 'quote_date' : 'date';
  
  let html = '';
  
  if (currentTemplate === 'basic_clean') {
    html = renderBasicClean(invoiceData, type, numberField, dateField);
  } else if (currentTemplate === 'modern_pro') {
    html = renderModernPro(invoiceData, type, numberField, dateField);
  } else if (currentTemplate === 'color_accent') {
    html = renderColorAccent(invoiceData, type, numberField, dateField);
  } else if (currentTemplate === 'big_total') {
    html = renderBigTotal(invoiceData, type, numberField, dateField);
  }
  
  template.innerHTML = html;
}

function renderBasicClean(data, type, numberField, dateField) {
  return `
    <div style="width: 100%; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: #000; font-family: Arial, sans-serif;">
      ${data.logo_url ? `<img src="${data.logo_url}" style="max-width: 200px; max-height: 80px; margin-bottom: 20px;">` : ''}
      
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px; color: #000;">${type}</h1>
        <p style="margin: 5px 0; color: #666; font-size: 12px;">${data.business_name || ''}</p>
        <p style="margin: 2px 0; color: #666; font-size: 12px;">${data.address || ''}</p>
        <p style="margin: 2px 0; color: #666; font-size: 12px;">${data.phone || ''}</p>
      </div>
      
      <table style="width: 100%; margin-bottom: 20px; font-size: 12px;">
        <tr>
          <td style="vertical-align: top; width: 50%;">
            <p style="margin: 0 0 5px 0; color: #666; font-size: 11px; font-weight: bold;">BILL TO:</p>
            <p style="margin: 0; color: #000; font-weight: bold;">${data.client_name || ''}</p>
            <p style="margin: 2px 0; color: #666;">${data.client?.email || ''}</p>
            <p style="margin: 2px 0; color: #666;">${data.client?.phone || ''}</p>
            <p style="margin: 2px 0; color: #666;">${data.client?.address || ''}</p>
          </td>
          <td style="vertical-align: top; text-align: right;">
            <p style="margin: 0 0 5px 0; color: #666; font-size: 11px; font-weight: bold;">${numberField === 'quote_number' ? 'QUOTE #' : 'INVOICE #'}</p>
            <p style="margin: 0; color: #000; font-size: 16px; font-weight: bold;">${data[numberField] || ''}</p>
            <p style="margin: 10px 0 2px 0; color: #666; font-size: 11px; font-weight: bold;">DATE</p>
            <p style="margin: 0; color: #000;">${data[dateField] || ''}</p>
          </td>
        </tr>
      </table>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
        <thead>
          <tr style="background: #f0f0f0; border: 1px solid #000;">
            <th style="padding: 10px; text-align: left; border: 1px solid #000;">DESCRIPTION</th>
            <th style="padding: 10px; text-align: center; border: 1px solid #000; width: 60px;">QTY</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #000; width: 80px;">UNIT PRICE</th>
            <th style="padding: 10px; text-align: right; border: 1px solid #000; width: 80px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${data.items?.map(item => `
            <tr style="border: 1px solid #ccc;">
              <td style="padding: 8px; border: 1px solid #ccc; word-wrap: break-word; overflow-wrap: break-word;">${item.description}</td>
              <td style="padding: 8px; text-align: center; border: 1px solid #ccc; white-space: nowrap;">${item.qty}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ccc; white-space: nowrap;">$${parseFloat(item.price).toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; border: 1px solid #ccc; white-space: nowrap;">$${parseFloat(item.total).toFixed(2)}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
      
      <div style="text-align: right; font-size: 12px; margin-bottom: 20px;">
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Subtotal:</span>
          <span>$${parseFloat(data.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Tax:</span>
          <span>$${parseFloat(data.tax || 0).toFixed(2)}</span>
        </div>
        <div style="border-top: 2px solid #000; padding-top: 8px; margin-top: 10px; font-weight: bold; font-size: 14px;">
          <span style="display: inline-block; width: 150px; text-align: left;">TOTAL:</span>
          <span>$${parseFloat(data.total || 0).toFixed(2)}</span>
        </div>
      </div>
      
      ${data.notes ? `<div style="border-top: 1px solid #ccc; padding-top: 15px; font-size: 11px; color: #666;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
      ${data.invoice_footer ? `<div style="text-align: center; font-size: 10px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ccc;">${data.invoice_footer}</div>` : ''}
    </div>
  `;
}

function renderModernPro(data, type, numberField, dateField) {
  return `
    <div style="width: 100%; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: #000; font-family: 'Segoe UI', Arial, sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
        <div>
          ${data.logo_url ? `<img src="${data.logo_url}" style="max-width: 200px; max-height: 80px; margin-bottom: 15px;">` : ''}
          <p style="margin: 0; font-weight: 600; font-size: 16px; color: #000;">${data.business_name || ''}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${data.address || ''}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${data.phone || ''}</p>
        </div>
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: #2c3e50;">${type}</h1>
          <p style="margin: 8px 0 0 0; font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px;">${numberField === 'quote_number' ? 'Quote' : 'Invoice'} #${data[numberField] || ''}</p>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
        <div>
          <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 700; color: #2c3e50; text-transform: uppercase;">Bill To</p>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #000;">${data.client_name || ''}</p>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${data.client?.email || ''}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #666;">${data.client?.phone || ''}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #666;">${data.client?.address || ''}</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 700; color: #2c3e50; text-transform: uppercase;">Date</p>
          <p style="margin: 0; font-size: 14px; color: #000;">${data[dateField] || ''}</p>
        </div>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
        <thead>
          <tr style="background: #2c3e50; color: white;">
            <th style="padding: 12px; text-align: left;">DESCRIPTION</th>
            <th style="padding: 12px; text-align: center; width: 60px;">QTY</th>
            <th style="padding: 12px; text-align: right; width: 80px;">UNIT PRICE</th>
            <th style="padding: 12px; text-align: right; width: 80px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${data.items?.map((item, i) => `
            <tr style="background: ${i % 2 === 0 ? '#f8f9fa' : 'white'}; border-bottom: 1px solid #e9ecef;">
              <td style="padding: 10px; word-wrap: break-word; overflow-wrap: break-word;">${item.description}</td>
              <td style="padding: 10px; text-align: center; white-space: nowrap;">${item.qty}</td>
              <td style="padding: 10px; text-align: right; white-space: nowrap;">$${parseFloat(item.price).toFixed(2)}</td>
              <td style="padding: 10px; text-align: right; font-weight: 600; white-space: nowrap;">$${parseFloat(item.total).toFixed(2)}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
      
      <div style="text-align: right; font-size: 12px; margin-bottom: 30px;">
        <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #e9ecef;">
          <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Subtotal:</span>
          <span>$${parseFloat(data.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 2px solid #2c3e50;">
          <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Tax:</span>
          <span>$${parseFloat(data.tax || 0).toFixed(2)}</span>
        </div>
        <div style="font-weight: 700; font-size: 16px; color: #2c3e50;">
          <span style="display: inline-block; width: 150px; text-align: left;">TOTAL DUE:</span>
          <span>$${parseFloat(data.total || 0).toFixed(2)}</span>
        </div>
      </div>
      
      ${data.notes ? `<div style="background: #f8f9fa; padding: 12px; margin-bottom: 15px; border-left: 3px solid #2c3e50; font-size: 11px; color: #666;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
      ${data.invoice_footer ? `<div style="text-align: center; font-size: 10px; color: #999; padding-top: 15px; border-top: 1px solid #e9ecef;">${data.invoice_footer}</div>` : ''}
    </div>
  `;
}

function renderColorAccent(data, type, numberField, dateField) {
  return `
    <div style="width: 100%; max-width: 800px; margin: 0 auto; padding: 0; background: white; color: #000; font-family: Arial, sans-serif;">
      <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); color: white; padding: 30px 40px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            ${data.logo_url ? `<img src="${data.logo_url}" style="max-width: 180px; max-height: 70px; filter: brightness(0) invert(1);">` : ''}
            <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">${data.business_name || ''}</p>
          </div>
          <h1 style="margin: 0; font-size: 36px; font-weight: 700;">${type}</h1>
        </div>
      </div>
      
      <div style="padding: 40px;">
        <table style="width: 100%; margin-bottom: 30px; font-size: 12px;">
          <tr>
            <td style="vertical-align: top; width: 50%;">
              <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">Bill To</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #000;">${data.client_name || ''}</p>
              <p style="margin: 4px 0; font-size: 12px; color: #666;">${data.client?.email || ''}</p>
              <p style="margin: 2px 0; font-size: 12px; color: #666;">${data.client?.phone || ''}</p>
              <p style="margin: 2px 0; font-size: 12px; color: #666;">${data.client?.address || ''}</p>
            </td>
            <td style="vertical-align: top; text-align: right;">
              <div style="margin-bottom: 15px;">
                <p style="margin: 0 0 5px 0; font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">${numberField === 'quote_number' ? 'Quote' : 'Invoice'} #</p>
                <p style="margin: 0; font-size: 16px; font-weight: 700; color: #1e3a8a;">${data[numberField] || ''}</p>
              </div>
              <p style="margin: 0 0 2px 0; font-size: 11px; font-weight: 700; color: #1e3a8a; text-transform: uppercase;">Date</p>
              <p style="margin: 0; font-size: 12px; color: #000;">${data[dateField] || ''}</p>
            </td>
          </tr>
        </table>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
          <thead>
            <tr style="background: #f3f4f6; border-bottom: 2px solid #1e3a8a;">
              <th style="padding: 12px; text-align: left; color: #1e3a8a; font-weight: 700;">DESCRIPTION</th>
              <th style="padding: 12px; text-align: center; color: #1e3a8a; font-weight: 700; width: 60px;">QTY</th>
              <th style="padding: 12px; text-align: right; color: #1e3a8a; font-weight: 700; width: 80px;">UNIT PRICE</th>
              <th style="padding: 12px; text-align: right; color: #1e3a8a; font-weight: 700; width: 80px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${data.items?.map(item => `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; word-wrap: break-word; overflow-wrap: break-word;">${item.description}</td>
                <td style="padding: 10px; text-align: center; white-space: nowrap;">${item.qty}</td>
                <td style="padding: 10px; text-align: right; white-space: nowrap;">$${parseFloat(item.price).toFixed(2)}</td>
                <td style="padding: 10px; text-align: right; white-space: nowrap;">$${item.total}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <div style="text-align: right; font-size: 12px; margin-bottom: 20px;">
          <div style="margin-bottom: 8px;">
            <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Subtotal:</span>
            <span>$${parseFloat(data.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="border-top: 1px solid #e5e7eb; padding-top: 8px; margin-top: 8px;">
            <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Tax:</span>
            <span>$${parseFloat(data.tax || 0).toFixed(2)}</span>
          </div>
        </div>
        
        ${data.notes ? `<div style="border-left: 3px solid #3b82f6; padding: 12px; margin-bottom: 15px; background: #f0f9ff; font-size: 11px; color: #0c4a6e;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
        ${data.invoice_footer ? `<div style="text-align: center; font-size: 10px; color: #999; padding-top: 15px; border-top: 1px solid #e5e7eb;">${data.invoice_footer}</div>` : ''}
      </div>
    </div>
  `;
}

function renderBigTotal(data, type, numberField, dateField) {
  return `
    <div style="width: 100%; max-width: 800px; margin: 0 auto; padding: 40px; background: white; color: #000; font-family: Arial, sans-serif;">
      ${data.logo_url ? `<img src="${data.logo_url}" style="max-width: 200px; max-height: 80px; margin-bottom: 20px;">` : ''}
      
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <p style="margin: 0; font-size: 14px; font-weight: 600; color: #000;">${data.business_name || ''}</p>
          <p style="margin: 4px 0; font-size: 11px; color: #666;">${data.address || ''}</p>
          <p style="margin: 2px 0; font-size: 11px; color: #666;">${data.phone || ''}</p>
        </div>
        <div style="text-align: right;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 700;">${type}</h1>
          <p style="margin: 5px 0; font-size: 12px; color: #666;">#${data[numberField] || ''}</p>
          <p style="margin: 2px 0; font-size: 12px; color: #666;">${data[dateField] || ''}</p>
        </div>
      </div>
      
      <div style="border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; font-size: 12px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #000;">BILL TO:</p>
        <p style="margin: 0; color: #000; font-weight: 600;">${data.client_name || ''}</p>
        <p style="margin: 4px 0 2px 0; color: #666;">${data.client?.email || ''} | ${data.client?.phone || ''}</p>
        <p style="margin: 0; color: #666;">${data.client?.address || ''}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;">
        <thead>
          <tr style="background: #000; color: white;">
            <th style="padding: 10px; text-align: left;">DESCRIPTION</th>
            <th style="padding: 10px; text-align: center; width: 60px;">QTY</th>
            <th style="padding: 10px; text-align: right; width: 80px;">UNIT PRICE</th>
            <th style="padding: 10px; text-align: right; width: 80px;">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${data.items?.map(item => `
            <tr style="border-bottom: 1px solid #ddd;">
              <td style="padding: 8px; word-wrap: break-word; overflow-wrap: break-word;">${item.description}</td>
              <td style="padding: 8px; text-align: center; white-space: nowrap;">${item.qty}</td>
              <td style="padding: 8px; text-align: right; white-space: nowrap;">$${parseFloat(item.price).toFixed(2)}</td>
              <td style="padding: 8px; text-align: right; white-space: nowrap;">$${parseFloat(item.total).toFixed(2)}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
      
      <div style="text-align: right; margin-bottom: 30px; font-size: 12px;">
        <div style="margin-bottom: 5px;">
          <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Subtotal:</span>
          <span>$${parseFloat(data.subtotal || 0).toFixed(2)}</span>
        </div>
        <div style="margin-bottom: 20px;">
          <span style="display: inline-block; width: 150px; text-align: left; color: #666;">Tax:</span>
          <span>$${parseFloat(data.tax || 0).toFixed(2)}</span>
        </div>
      </div>
      
      <div style="background: #000; color: white; padding: 30px; text-align: center; margin-bottom: 30px; border-radius: 8px;">
        <p style="margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">TOTAL DUE</p>
        <p style="margin: 0; font-size: 48px; font-weight: 700;">$${parseFloat(data.total || 0).toFixed(2)}</p>
      </div>
      
      ${data.notes ? `<div style="border: 1px solid #ddd; padding: 12px; margin-bottom: 15px; font-size: 11px; color: #666;"><strong>Notes:</strong> ${data.notes}</div>` : ''}
      ${data.invoice_footer ? `<div style="text-align: center; font-size: 10px; color: #999; padding-top: 15px; border-top: 1px solid #ddd;">${data.invoice_footer}</div>` : ''}
    </div>
  `;
}
