export const validate2And3ParametersHaveUniqueNameAndInCombinations = () => (system) => {
  return system.validateSelectors
    .allParameterArrays()
    .then(nodes => {
      return nodes.reduce((acc, node) => {
        const parameters = node.node || []
        const isOperationParameters = system.validateSelectors.isOperationParameters(node)
        const isPathItemParameters = system.validateSelectors.isPathItemParameters(node)

        var inheritedParameters = []

        if(isOperationParameters) {
          const pathItemParameters = (node.parent.parent.node.parameters || [])
            .map(preserveOriginalIndices)
          const rootParameters = (getRootNode(node).node.parameters || [])
            .map(preserveOriginalIndices)

          inheritedParameters = [
            ...rootParameters,
            ...pathItemParameters
          ]
        } else if(isPathItemParameters) {
          const rootParameters = (getRootNode(node).node.parameters || [])
            .map(preserveOriginalIndices)

          inheritedParameters = [
            ...rootParameters
          ]
        } else {
          inheritedParameters = []
        }

        const seen = []

        inheritedParameters.forEach(param => {
          const { name: paramName, in: paramIn } = param

          if(!paramName || !paramIn) {
            // name or in is missing, so we can't match the param to anything else
            return
          }
          const key = `${paramName}::${paramIn}`
          seen.push(key)
        })

        parameters.forEach((param, i) => {
          const { name: paramName, in: paramIn } = param

          if(!paramName || !paramIn) {
            // name or in is missing, so we can't match the param to anything else
            return
          }
          const key = `${paramName}::${paramIn}`
          if(seen.indexOf(key) > -1) {
            acc.push({
              level: "error",
              message: "Sibling parameters, whether inherited or direct, must have unique name + in values",
              path: [
                ...node.path,
                (param.__i || i).toString()
              ]
            })
          }
          seen.push(key)
        })

        return acc
      }, [])
    })
}

export const validate2And3ParameterDefaultsMatchAnEnum = () => (system) => {
  return system.validateSelectors
    .allParameters()
    .then(nodes => {
      return nodes.reduce((acc, node) => {
        const parameter = node.node || {}
        const isOAS3 = system.specSelectors.isOAS3()
        let paramEnum, paramDefault, internalLocation


        if(isOAS3) {
          const schema = parameter.schema
          if(!schema || schema.enum === undefined || schema.default === undefined) {
            // nothing to do
            return
          }
          paramEnum = schema.enum
          paramDefault = schema.default
          internalLocation = ["schema", "default"]
        } else {
          if(!parameter || parameter.enum === undefined || parameter.default === undefined) {
            // nothing to do
            return
          }
          paramEnum = parameter.enum
          paramDefault = parameter.default
          internalLocation = ["default"]
        }

        if(paramEnum.indexOf(paramDefault) === -1) {
          acc.push({
            message: "Default values must be present in `enum`",
            path: [...node.path, ...internalLocation]
          })
        }

        return acc
      }, [])
    })
}



const HARD_LIMIT = 100

function preserveOriginalIndices(obj, i) {
  obj.__i = i
  return obj
}

function getRootNode(node) {
  var i = 0
  while(node.notRoot && i < HARD_LIMIT) {
    node = node.parent
    i++
  }
  return node
}
