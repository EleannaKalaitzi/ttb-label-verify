import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvRows, parseApplicationsCsv } from './csv-parse';

test('parseCsvRows handles quoted fields with commas and "" escapes', () => {
  const rows = parseCsvRows('a,b\n"x, y","he said ""hi"""\n');
  assert.deepEqual(rows, [
    ['a', 'b'],
    ['x, y', 'he said "hi"'],
  ]);
});

test('parseApplicationsCsv maps filename → application data (order-independent headers)', () => {
  const csv =
    'class_type,filename,alcohol_content,brand_name,producer_bottler,country_of_origin,net_contents\n' +
    'Kentucky Straight Bourbon Whiskey,05-bourbon-38.png,38%,Stone\'s Throw,"Stone\'s Throw Distillery, Louisville, KY",,750 mL\n';
  const map = parseApplicationsCsv(csv);
  const a = map.get('05-bourbon-38.png');
  assert.ok(a);
  assert.equal(a!.class_type, 'Kentucky Straight Bourbon Whiskey');
  assert.equal(a!.alcohol_content, '38%');
  assert.equal(a!.producer_bottler, "Stone's Throw Distillery, Louisville, KY"); // comma inside quotes preserved
  assert.equal(a!.country_of_origin, null); // empty → null
});

test('parseApplicationsCsv accepts common aliases (brand, abv, bottler, country)', () => {
  const map = parseApplicationsCsv('file,brand,type,abv,bottler,country\nlabel.png,Acme,Vodka,40%,Acme Co,\n');
  const a = map.get('label.png');
  assert.equal(a?.brand_name, 'Acme');
  assert.equal(a?.class_type, 'Vodka');
  assert.equal(a?.alcohol_content, '40%');
});

test('a CSV without a filename column yields an empty map (nothing to match)', () => {
  assert.equal(parseApplicationsCsv('brand,abv\nAcme,40%\n').size, 0);
});
