import invariant from 'invariant';
import Block from '../../models/Block';

function normalizePartType(inputType) {
  let partType = inputType.toLowerCase();
  if (partType === 'orf') {
    partType = 'cds';
  }

  return partType;
}

function parseBasicFields(result) {
  const { name, part_type } = result;
  const partType = normalizePartType(part_type);

  return new Block({
    metadata: {
      name: name,
    },
    rules: {
      sbol: partType,
    },
    source: {
      source: 'igem',
      id: name,
    },
  });
}

//sync
export function parseSearchResult(result) {
  return parseBasicFields(result);
}

//async
export function parseFullResult(result) {
  const { sequence } = result;
  const block = parseBasicFields(result);
  return block.setSequence(sequence);
}

export function parseResults(results) {
  invariant(Array.isArray(results), 'results must be an array');

  return results.map(parseSearchResult);
}

export default parseResults;
