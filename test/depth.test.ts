import assert from 'node:assert/strict';
import test from 'node:test';
import {
  indentationDepth,
  normalizeIndentSize,
  paletteIndex,
  visualIndentColumns,
} from '../src/depth';

test('counts leading spaces and stops at code', () => {
  assert.equal(visualIndentColumns('        const value = 1;', 4), 8);
  assert.equal(indentationDepth('        const value = 1;', 4), 2);
});

test('uses tab stops for tabs and mixed indentation', () => {
  assert.equal(visualIndentColumns('\tvalue', 4), 4);
  assert.equal(visualIndentColumns('  \tvalue', 4), 4);
  assert.equal(visualIndentColumns('    \tvalue', 4), 8);
  assert.equal(indentationDepth('  \tvalue', 4), 1);
});

test('ignores partial indentation levels', () => {
  assert.equal(indentationDepth('   value', 4), 0);
  assert.equal(indentationDepth('      value', 4), 1);
});

test('normalizes invalid indentation sizes', () => {
  assert.equal(normalizeIndentSize(2.9), 2);
  assert.equal(normalizeIndentSize(0, 4), 4);
  assert.equal(normalizeIndentSize('nope', 3), 3);
});

test('clamps or cycles palette indexes', () => {
  assert.equal(paletteIndex(1, 3, 'clamp'), 0);
  assert.equal(paletteIndex(5, 3, 'clamp'), 2);
  assert.equal(paletteIndex(5, 3, 'cycle'), 1);
  assert.equal(paletteIndex(0, 3, 'cycle'), undefined);
  assert.equal(paletteIndex(2, 0, 'clamp'), undefined);
});
