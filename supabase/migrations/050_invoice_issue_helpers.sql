-- Helpers for per-studio invoice numbering and issuance

-- Generate next invoice number per studio (numeric text)
CREATE OR REPLACE FUNCTION public.next_invoice_number(in_studio_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number BIGINT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('invoice_number_' || in_studio_id::TEXT));

  SELECT COALESCE(MAX(invoice_number::BIGINT), 0) + 1
  INTO next_number
  FROM public.invoice_master
  WHERE studio_id = in_studio_id;

  RETURN next_number::TEXT;
END;
$$;

-- Issue an invoice by attaching all pending charges in the date range
CREATE OR REPLACE FUNCTION public.issue_invoice(
  in_studio_id UUID,
  in_client_id UUID,
  in_period_start DATE,
  in_period_end DATE,
  in_pdf_url TEXT,
  in_created_by UUID
) RETURNS public.invoice_master
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_ids UUID[];
  new_invoice_id UUID;
  to_invoice_status UUID;
  invoiced_status UUID;
  next_number TEXT;
BEGIN
  IF NOT public.is_studio_admin(in_studio_id) THEN
    RAISE EXCEPTION 'Not authorized to issue invoices for studio %', in_studio_id;
  END IF;

  IF in_period_end < in_period_start THEN
    RAISE EXCEPTION 'period_end must be on or after period_start';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('issue_invoice_' || in_studio_id::TEXT));

  SELECT id INTO to_invoice_status FROM public.invoice_statuses WHERE name = 'to_invoice';
  SELECT id INTO invoiced_status FROM public.invoice_statuses WHERE name = 'invoiced';

  IF to_invoice_status IS NULL OR invoiced_status IS NULL THEN
    RAISE EXCEPTION 'Invoice statuses not seeded';
  END IF;

  SELECT array_agg(id ORDER BY service_date, created_at) INTO pending_ids
  FROM public.invoice_details
  WHERE studio_id = in_studio_id
    AND client_id = in_client_id
    AND status_id = to_invoice_status
    AND service_date BETWEEN in_period_start AND in_period_end
  FOR UPDATE;

  IF pending_ids IS NULL OR array_length(pending_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No pending charges to invoice for studio %, client %, range % - %',
      in_studio_id, in_client_id, in_period_start, in_period_end;
  END IF;

  next_number := public.next_invoice_number(in_studio_id);

  INSERT INTO public.invoice_master (
    studio_id,
    client_id,
    invoice_number,
    period_start,
    period_end,
    issued_at,
    pdf_url,
    created_by
  )
  VALUES (
    in_studio_id,
    in_client_id,
    next_number,
    in_period_start,
    in_period_end,
    NOW(),
    in_pdf_url,
    in_created_by
  )
  RETURNING id INTO new_invoice_id;

  UPDATE public.invoice_details
  SET status_id = invoiced_status,
      invoice_id = new_invoice_id
  WHERE id = ANY(pending_ids);

  RETURN (
    SELECT im FROM public.invoice_master im WHERE im.id = new_invoice_id
  );
END;
$$;
