const {
  GET_PROVIDER_ENUM,
  GET_ROLE_ENUM,
} = require('../schema')
let _providers = null
let _roles = null
const enumValues = async (graphql) => {
  if (_providers === null) {
    const resp = await graphql(GET_PROVIDER_ENUM)
    if (Array.isArray(resp?.__type?.enumValues)) {
      _providers
        = resp.__type.enumValues.map(({name}) => name)
    }
  }
  return _providers
}

const roleEnumValues = async (graphql) => {
  if (_roles === null) {
    const resp = await graphql(GET_ROLE_ENUM)
    if (Array.isArray(resp?.__type?.enumValues)) {
      _roles
        = resp.__type.enumValues.map(({name}) => name)
    }
  }
  return _roles
}
module.exports
  = {
  providerEnumValues: enumValues,
  roleEnumValues,
}
