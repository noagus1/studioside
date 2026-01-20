import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getSupabaseClient } from '@/lib/supabase/serverClient'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await getSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('id', params.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const doc = new PDFDocument({ margin: 50 })
  const chunks: Uint8Array[] = []

  doc.on('data', (chunk) => chunks.push(chunk))
  doc.on('error', (err) => console.error('PDF generation error', err))

  doc.fontSize(18).text(`Invoice ${data.invoice_number}`, { align: 'right' })
  doc.moveDown(0.5)
  doc.fontSize(12).text(`Status: ${data.status.toUpperCase()}`, { align: 'right' })
  doc.moveDown()

  doc.fontSize(14).text('Bill To', { underline: true })
  doc.fontSize(12).text(data.customer_name || 'Client')
  if (data.customer_email) {
    doc.text(data.customer_email)
  }
  doc.moveDown()
  doc.text(`Issue Date: ${data.issue_date || 'N/A'}`)
  doc.text(`Due Date: ${data.due_date || 'N/A'}`)
  doc.moveDown()

  doc.fontSize(14).text('Line Items', { underline: true })
  doc.moveDown(0.5)

  const items = (data.invoice_items || []) as any[]
  items
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .forEach((item) => {
      const qty = Number(item.quantity) || 0
      const unit = Number(item.unit_amount) || 0
      const lineTotal = qty * unit
      doc.fontSize(12).text(item.name)
      if (item.description) {
        doc.fontSize(10).fillColor('#4B5563').text(item.description)
        doc.fillColor('black')
      }
      doc.fontSize(10).text(`Qty: ${qty}  Rate: ${formatMoney(unit, data.currency)}  Line: ${formatMoney(lineTotal, data.currency)}`)
      doc.moveDown(0.5)
    })

  doc.moveDown()
  doc.fontSize(12).text(`Subtotal: ${formatMoney(data.subtotal, data.currency)}`, { align: 'right' })
  doc.text(`Tax: ${formatMoney(data.tax_total, data.currency)}`, { align: 'right' })
  if (data.discount_total > 0) {
    doc.text(`Discounts: -${formatMoney(data.discount_total, data.currency)}`, { align: 'right' })
  }
  doc.fontSize(14).text(`Total: ${formatMoney(data.total, data.currency)}`, { align: 'right' })

  if (data.memo) {
    doc.moveDown()
    doc.fontSize(12).text('Memo', { underline: true })
    doc.fontSize(11).text(data.memo)
  }

  doc.end()

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    const result = Buffer.concat(chunks.map((c) => Buffer.from(c)))
    resolve(result)
  })

  // Use Uint8Array to satisfy BodyInit without SharedArrayBuffer union
  const pdfBytes = new Uint8Array(pdfBuffer)

  return new NextResponse(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${data.invoice_number || 'invoice'}.pdf"`,
    },
  })
}

function formatMoney(amount: number, currency?: string) {
  const safeCurrency = (currency || 'USD').toUpperCase()
  return `${safeCurrency} ${amount?.toFixed(2) ?? '0.00'}`
}
