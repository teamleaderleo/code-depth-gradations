import assert from 'node:assert/strict';
import test from 'node:test';
import {
  depthSlot,
  indentationDepth,
  normalizeHexColor,
  normalizeIndentSize,
  opacityForDepth,
  rgbaFromHex,
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

test('clamps depth slots at the deepest generated shade', () => {
  assert.equal(depthSlot(1, 3), 0);
  assert.equal(depthSlot(2, 3), 1);
  assert.equal(depthSlot(8, 3), 2);
  assert.equal(depthSlot(0, 3), undefined);
  assert.equal(depthSlot(2, 0), undefined);
});

test('maps depth through a configurable opacity curve', () => {
  assert.equal(opacityForDepth(1, 5, 0.01, 0.11, 2), 0.01);
  assert.equal(opacityForDepth(3, 5, 0.01, 0.11, 2), 0.035);
  assert.equal(opacityForDepth(5, 5, 0.01, 0.11, 2), 0.11);
  assert.equal(opacityForDepth(20, 5, 0.01, 0.11, 2), 0.11);
  assert.equal(opacityForDepth(0, 5, 0.01, 0.11, 2), undefined);
});

test('builds translucent CSS colors from short and long hex values', () => {
  assert.equal(rgbaFromHex('#fff', 0.125), 'rgba(255, 255, 255, 0.125)');
  assert.equal(rgbaFromHex('#7c3aed', 0.08), 'rgba(124, 58, 237, 0.08)');
  assert.equal(rgbaFromHex('purple', 0.08), undefined);
});

test('falls back when a custom tint is invalid', () => {
  assert.equal(normalizeHexColor('#abc', '#ffffff'), '#abc');
  assert.equal(normalizeHexColor('purple', '#ffffff'), '#ffffff');
});
