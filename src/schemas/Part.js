import * as types from './validators';
import FeatureSchema from './FeatureSchema';

/*
A physical sequence.

*/

const PartSchema = types.shape({
  id      : types.id().isRequired,
  parent  : types.id(),
  metadata: types.shape({
    authors : types.arrayOf(types.id()).isRequired,
    tags    : types.object().isRequired,
    name       : types.string(),
    description: types.string()
  }).isRequired,

  sequence: types.id().isRequired,
  source  : types.id(),
  features: types.arrayOf(FeatureSchema)
}).isRequired;

export default PartSchema;