(function() {
  var nodes, uritemplate,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  nodes = require('./nodes');

  uritemplate = require('uritemplate');

  /*
     Applies transformations to the RAML
  */


  this.Transformations = (function() {
    function Transformations() {
      this.isContentTypeString = __bind(this.isContentTypeString, this);
      this.add_key_value_to_node = __bind(this.add_key_value_to_node, this);
      this.apply_default_media_type_to_resource = __bind(this.apply_default_media_type_to_resource, this);
      this.get_media_type = __bind(this.get_media_type, this);
      this.load_default_media_type = __bind(this.load_default_media_type, this);
      this.applyAstTransformations = __bind(this.applyAstTransformations, this);
      this.applyTransformations = __bind(this.applyTransformations, this);
      this.declaredSchemas = {};
    }

    Transformations.prototype.applyTransformations = function(rootObject) {
      return this.findAndInsertUriParameters(rootObject);
    };

    Transformations.prototype.applyAstTransformations = function(document) {
      return this.transform_document(document);
    };

    Transformations.prototype.load_default_media_type = function(node) {
      if (!this.isMapping(node || (node != null ? node.value : void 0))) {
        return;
      }
      return this.mediaType = this.property_value(node, "mediaType");
    };

    Transformations.prototype.get_media_type = function() {
      return this.mediaType;
    };

    Transformations.prototype.findAndInsertUriParameters = function(rootObject) {
      var resources;
      this.findAndInsertMissingBaseUriParameters(rootObject);
      resources = rootObject.resources;
      return this.findAndInsertMissinngBaseUriParameters(resources);
    };

    Transformations.prototype.findAndInsertMissingBaseUriParameters = function(rootObject) {
      var expressions, template;
      if (rootObject.baseUri) {
        template = uritemplate.parse(rootObject.baseUri);
        expressions = template.expressions.filter(function(expr) {
          return 'templateText' in expr;
        }).map(function(expression) {
          return expression.templateText;
        });
        if (expressions.length) {
          if (!rootObject.baseUriParameters) {
            rootObject.baseUriParameters = {};
          }
        }
        return expressions.forEach(function(parameterName) {
          if (!(parameterName in rootObject.baseUriParameters)) {
            rootObject.baseUriParameters[parameterName] = {
              type: "string",
              required: true,
              displayName: parameterName
            };
            if (parameterName === "version") {
              return rootObject.baseUriParameters[parameterName]["enum"] = [rootObject.version];
            }
          }
        });
      }
    };

    Transformations.prototype.findAndInsertMissinngBaseUriParameters = function(resources) {
      var _this = this;
      if (resources != null ? resources.length : void 0) {
        return resources.forEach(function(resource) {
          var expressions, template;
          template = uritemplate.parse(resource.relativeUri);
          expressions = template.expressions.filter(function(expr) {
            return 'templateText' in expr;
          }).map(function(expression) {
            return expression.templateText;
          });
          if (expressions.length) {
            if (!resource.uriParameters) {
              resource.uriParameters = {};
            }
          }
          expressions.forEach(function(parameterName) {
            if (!(parameterName in resource.uriParameters)) {
              return resource.uriParameters[parameterName] = {
                type: "string",
                required: true,
                displayName: parameterName
              };
            }
          });
          return _this.findAndInsertMissinngBaseUriParameters(resource.resources);
        });
      }
    };

    /*
    Media Type pivot when using default mediaType property
    */


    Transformations.prototype.apply_default_media_type_to_resource = function(resource) {
      var methods,
        _this = this;
      if (!this.mediaType) {
        return;
      }
      if (!this.isMapping(resource)) {
        return;
      }
      methods = this.child_methods(resource);
      return methods.forEach(function(method) {
        return _this.apply_default_media_type_to_method(method[1]);
      });
    };

    Transformations.prototype.apply_default_media_type_to_method = function(method) {
      var responses,
        _this = this;
      if (!this.mediaType) {
        return;
      }
      if (!this.isMapping(method)) {
        return;
      }
      if (this.has_property(method, "body")) {
        this.apply_default_media_type_to_body(this.get_property(method, "body"));
      }
      if (this.has_property(method, "responses")) {
        responses = this.get_property(method, "responses");
        return responses.value.forEach(function(response) {
          if (_this.has_property(response[1], "body")) {
            return _this.apply_default_media_type_to_body(_this.get_property(response[1], "body"));
          }
        });
      }
    };

    Transformations.prototype.apply_default_media_type_to_body = function(body) {
      var key, responseType, responseTypeKey, _ref, _ref1, _ref2;
      if (!this.isMapping(body)) {
        return;
      }
      if (body != null ? (_ref = body.value) != null ? (_ref1 = _ref[0]) != null ? (_ref2 = _ref1[0]) != null ? _ref2.value : void 0 : void 0 : void 0 : void 0) {
        key = body.value[0][0].value;
        if (!key.match(/\//)) {
          responseType = new nodes.MappingNode('tag:yaml.org,2002:map', [], body.start_mark, body.end_mark);
          responseTypeKey = new nodes.ScalarNode('tag:yaml.org,2002:str', this.mediaType, body.start_mark, body.end_mark);
          responseType.value.push([responseTypeKey, body.clone()]);
          return body.value = responseType.value;
        }
      }
    };

    Transformations.prototype.noop = function() {};

    Transformations.prototype.transform_types = function(typeProperty) {
      var types,
        _this = this;
      types = typeProperty.value;
      return types.forEach(function(type_entry) {
        return type_entry.value.forEach(function(type) {
          return _this.transform_resource(type, true);
        });
      });
    };

    Transformations.prototype.transform_traits = function(traitProperty) {
      var traits,
        _this = this;
      traits = traitProperty.value;
      return traits.forEach(function(trait_entry) {
        return trait_entry.value.forEach(function(trait) {
          return _this.transform_method(trait[1], true);
        });
      });
    };

    Transformations.prototype.transform_named_params = function(property, allowParameterKeys) {
      var _this = this;
      if (this.isNull(property[1])) {
        return;
      }
      return property[1].value.forEach(function(param) {
        return _this.transform_common_parameter_properties(param[0].value, param[1], allowParameterKeys);
      });
    };

    Transformations.prototype.transform_common_parameter_properties = function(parameterName, node, allowParameterKeys) {
      var _this = this;
      if (!node.value) {
        return;
      }
      if (this.isSequence(node)) {
        return node.value.forEach(function(parameter) {
          return _this.transform_named_parameter(parameterName, parameter, allowParameterKeys);
        });
      } else {
        return this.transform_named_parameter(parameterName, node, allowParameterKeys);
      }
    };

    Transformations.prototype.transform_named_parameter = function(parameterName, node, allowParameterKeys) {
      var hasDisplayName, hasRequired, hasType,
        _this = this;
      hasDisplayName = false;
      hasRequired = false;
      hasType = false;
      node.value.forEach(function(childNode) {
        var canonicalPropertyName;
        if (allowParameterKeys && _this.isParameterKey(childNode)) {
          return;
        }
        canonicalPropertyName = _this.canonicalizePropertyName(childNode[0].value, allowParameterKeys);
        switch (canonicalPropertyName) {
          case "pattern":
            return _this.noop();
          case "default":
            return _this.noop();
          case "enum":
            return _this.noop();
          case "description":
            return _this.noop();
          case "example":
            return _this.noop();
          case "minLength":
            return _this.noop();
          case "maxLength":
            return _this.noop();
          case "minimum":
            return _this.noop();
          case "maximum":
            return _this.noop();
          case "repeat":
            return _this.noop();
          case "displayName":
            return hasDisplayName = true;
          case "type":
            return hasType = true;
          case "required":
            return hasRequired = true;
          default:
            return _this.noop();
        }
      });
      if (!hasDisplayName) {
        this.add_key_value_to_node(node, 'displayName', 'tag:yaml.org,2002:str', this.canonicalizePropertyName(parameterName, allowParameterKeys));
      }
      if (!hasRequired) {
        this.add_key_value_to_node(node, 'required', 'tag:yaml.org,2002:bool', 'true');
      }
      if (!hasType) {
        return this.add_key_value_to_node(node, 'type', 'tag:yaml.org,2002:str', 'string');
      }
    };

    Transformations.prototype.add_key_value_to_node = function(node, keyName, valueTag, value) {
      var propertyName, propertyValue;
      propertyName = new nodes.ScalarNode('tag:yaml.org,2002:str', keyName, node.start_mark, node.end_mark);
      propertyValue = new nodes.ScalarNode(valueTag, value, node.start_mark, node.end_mark);
      return node.value.push([propertyName, propertyValue]);
    };

    Transformations.prototype.transform_document = function(node) {
      var _this = this;
      if (node != null ? node.value : void 0) {
        return node.value.forEach(function(property) {
          var _ref;
          switch (property[0].value) {
            case "title":
              return _this.noop();
            case "securitySchemes":
              return _this.noop();
            case "schemas":
              return _this.noop();
            case "version":
              return _this.noop();
            case "documentation":
              return _this.noop();
            case "mediaType":
              return _this.noop();
            case "securedBy":
              return _this.noop();
            case "baseUri":
              return _this.noop();
            case "traits":
              return _this.transform_traits(property[1]);
            case "baseUriParameters":
              return _this.transform_named_params(property, false);
            case "resourceTypes":
              return _this.transform_types(property[1]);
            case "resources":
              return (_ref = property[1]) != null ? _ref.value.forEach(function(resource) {
                return _this.transform_resource(resource);
              }) : void 0;
            default:
              return _this.noop();
          }
        });
      }
    };

    Transformations.prototype.transform_resource = function(resource, allowParameterKeys) {
      var _this = this;
      if (allowParameterKeys == null) {
        allowParameterKeys = false;
      }
      if (resource.value) {
        return resource.value.forEach(function(property) {
          var canonicalKey, isKnownCommonProperty, _ref, _ref1;
          isKnownCommonProperty = _this.transform_common_properties(property, allowParameterKeys);
          if (!isKnownCommonProperty) {
            if (property[0].value.match(new RegExp("^(get|post|put|delete|head|patch|options)" + (allowParameterKeys ? '\\??' : '') + "$"))) {
              return _this.transform_method(property[1], allowParameterKeys);
            } else {
              canonicalKey = _this.canonicalizePropertyName(property[0].value, allowParameterKeys);
              switch (canonicalKey) {
                case "type":
                  return _this.noop();
                case "usage":
                  return _this.noop();
                case "securedBy":
                  return _this.noop();
                case "uriParameters":
                  return _this.transform_named_params(property, allowParameterKeys);
                case "baseUriParameters":
                  return _this.transform_named_params(property, allowParameterKeys);
                case "resources":
                  return (_ref = property[1]) != null ? _ref.value.forEach(function(resource) {
                    return _this.transform_resource(resource);
                  }) : void 0;
                case "methods":
                  return (_ref1 = property[1]) != null ? _ref1.value.forEach(function(method) {
                    return _this.transform_method(method, allowParameterKeys);
                  }) : void 0;
                default:
                  return _this.noop();
              }
            }
          }
        });
      }
    };

    Transformations.prototype.transform_method = function(method, allowParameterKeys) {
      var _this = this;
      if (this.isNull(method)) {
        return;
      }
      return method.value.forEach(function(property) {
        var canonicalKey;
        if (_this.transform_common_properties(property, allowParameterKeys)) {
          return;
        }
        canonicalKey = _this.canonicalizePropertyName(property[0].value, allowParameterKeys);
        switch (canonicalKey) {
          case "securedBy":
            return _this.noop();
          case "usage":
            return _this.noop();
          case "headers":
            return _this.transform_named_params(property, allowParameterKeys);
          case "queryParameters":
            return _this.transform_named_params(property, allowParameterKeys);
          case "body":
            return _this.transform_body(property, allowParameterKeys);
          case "responses":
            return _this.transform_responses(property, allowParameterKeys);
          default:
            return _this.noop();
        }
      });
    };

    Transformations.prototype.transform_responses = function(responses, allowParameterKeys) {
      var _this = this;
      if (this.isNull(responses[1])) {
        return;
      }
      return responses[1].value.forEach(function(response) {
        return _this.transform_response(response, allowParameterKeys);
      });
    };

    Transformations.prototype.transform_response = function(response, allowParameterKeys) {
      var _this = this;
      if (this.isMapping(response[1])) {
        return response[1].value.forEach(function(property) {
          var canonicalKey;
          canonicalKey = _this.canonicalizePropertyName(property[0].value, allowParameterKeys);
          switch (canonicalKey) {
            case "description":
              return _this.noop();
            case "body":
              return _this.transform_body(property, allowParameterKeys);
            case "headers":
              return _this.transform_named_params(property, allowParameterKeys);
            default:
              return _this.noop();
          }
        });
      }
    };

    Transformations.prototype.isContentTypeString = function(value) {
      return value != null ? value.match(/^[^\/]+\/[^\/]+$/) : void 0;
    };

    Transformations.prototype.transform_body = function(property, allowParameterKeys) {
      var _ref,
        _this = this;
      if (this.isNull(property[1])) {
        return;
      }
      return (_ref = property[1].value) != null ? _ref.forEach(function(bodyProperty) {
        var canonicalProperty;
        if (_this.isParameterKey(bodyProperty)) {
          return _this.noop();
        } else if (_this.isContentTypeString(bodyProperty[0].value)) {
          return _this.transform_body(bodyProperty, allowParameterKeys);
        } else {
          canonicalProperty = _this.canonicalizePropertyName(bodyProperty[0].value, allowParameterKeys);
          switch (canonicalProperty) {
            case "example":
              return _this.noop();
            case "schema":
              return _this.noop();
            case "formParameters":
              return _this.transform_named_params(bodyProperty, allowParameterKeys);
            default:
              return _this.noop();
          }
        }
      }) : void 0;
    };

    Transformations.prototype.transform_common_properties = function(property, allowParameterKeys) {
      var canonicalProperty;
      if (this.isParameterKey(property)) {
        return true;
      } else {
        canonicalProperty = this.canonicalizePropertyName(property[0].value, allowParameterKeys);
        switch (canonicalProperty) {
          case "displayName":
            return true;
          case "description":
            return true;
          case "is":
            return true;
          default:
            this.noop();
        }
      }
      return false;
    };

    return Transformations;

  })();

}).call(this);