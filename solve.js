// Fast drop-in for csv-reader 1.0.0 (make.fun's own reference CSV reader).
// Returns exactly csv-reader 1.0.0's answer {columns, rows, errors} for every
// input {text, header}, single pass, left to right. The speed comes from
// cutting fields out with indexOf/slice instead of one character at a time:
// an unquoted field is the slice up to the next comma or LF (a stray CR inside
// it falls back to the character loop), and a quoted field is the slice up to
// the next non-doubled quote. Every broken-row rule, error code, error order
// and line count follows csv-reader 1.0.0: BOM dropped, empty lines are no
// record, lone CR outside quotes dropped (stray_cr), "" inside quotes is one
// quote, CRLF/lone CR inside quotes read as LF, junk after a closing quote
// appended as-is (quote_junk), an unclosed quote is a literal and the rest is
// re-read as unquoted (unterminated_quote), quotes inside unquoted fields are
// literal, fields stay strings, rows padded (short_row) or cut (long_row) to
// the first record's width.

/** csv-reader 1.0.0's answer for one case's input. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (n > 0 && text.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and its index in rows (null: the header).
  let recordLine = 1;
  let recordRow = null;

  // Reads unquoted characters onto `value` up to the next comma or line break,
  // exactly as csv-reader 1.0.0 does it: a CR not followed by LF is dropped
  // (stray_cr). Returns {value, ended, added}; ended 0 comma, 1 line break,
  // 2 end of text. Rare path: taken only when a field holds a stray CR, as the
  // re-read after an unterminated quote, or after a closing quote.
  function readUnquotedSlow(value) {
    let added = 0;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        pos += 1;
        return { value, ended: 0, added };
      }
      if (c === 10) {
        pos += 1;
        line += 1;
        return { value, ended: 1, added };
      }
      if (c === 13) {
        if (text.charCodeAt(pos + 1) === 10) {
          pos += 2;
          line += 1;
          return { value, ended: 1, added };
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        continue;
      }
      value += text[pos];
      added += 1;
      pos += 1;
    }
    return { value, ended: 2, added };
  }

  // Reads a quoted field whose opening quote is at pos. Returns
  // {value, ended} with ended 0 comma, 1 line break, 2 end of text.
  function readQuoted() {
    const open = pos;
    const openLine = line;
    let scan = pos + 1;
    let parts = null; // segments around doubled quotes, null while none met
    let closedAt = -1;
    while (true) {
      const q = text.indexOf('"', scan);
      if (q === -1) break;
      if (text.charCodeAt(q + 1) === 34) {
        if (parts === null) parts = [text.slice(scan, q)];
        else parts.push(text.slice(scan, q));
        parts.push('"');
        scan = q + 2;
        continue;
      }
      closedAt = q;
      break;
    }
    if (closedAt === -1) {
      // The quote never closes: it is a literal character, and the text
      // after it is read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return readUnquotedSlow('"');
    }
    let val;
    if (parts === null) val = text.slice(scan, closedAt);
    else {
      parts.push(text.slice(scan, closedAt));
      val = parts.join('');
    }
    // Line breaks inside the quotes, each one LF in the value.
    if (val.indexOf('\n') !== -1 || val.indexOf('\r') !== -1) {
      let add = 0;
      let i = -1;
      while ((i = val.indexOf('\n', i + 1)) !== -1) add += 1;
      i = -1;
      while ((i = val.indexOf('\r', i + 1)) !== -1) {
        if (val.charCodeAt(i + 1) !== 10) add += 1;
      }
      line += add;
      if (val.indexOf('\r') !== -1) val = val.replace(/\r\n?/g, '\n');
    }
    pos = closedAt + 1;
    if (pos >= n) return { value: val, ended: 2 };
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      return { value: val, ended: 0 };
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      return { value: val, ended: 1 };
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      return { value: val, ended: 1 };
    }
    // What follows the closing quote is appended as it stands, up to the next
    // comma or line break.
    const r = readUnquotedSlow(val);
    if (r.added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return r;
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let ended;
    let quoted = false;
    do {
      if (text.charCodeAt(pos) === 34) {
        quoted = true;
        const r = readQuoted();
        fields.push(r.value);
        ended = r.ended;
      } else {
        quoted = false;
        // Unquoted field: the slice up to the next comma or LF.
        const cIdx = text.indexOf(',', pos);
        const nIdx = text.indexOf('\n', pos);
        let end;
        let cut = 0; // a CR that is the first half of a CRLF line break
        if (cIdx !== -1 && (nIdx === -1 || cIdx < nIdx)) {
          end = cIdx;
          ended = 0;
        } else if (nIdx !== -1) {
          end = nIdx;
          ended = 1;
          if (end > pos && text.charCodeAt(end - 1) === 13) cut = 1;
        } else {
          end = n;
          ended = 2;
        }
        const seg = text.slice(pos, end - cut);
        if (seg.indexOf('\r') === -1) {
          fields.push(seg);
          pos = ended === 2 ? n : end + 1;
          if (ended === 1) line += 1;
        } else {
          const r = readUnquotedSlow('');
          fields.push(r.value);
          ended = r.ended;
        }
      }
    } while (ended === 0);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
