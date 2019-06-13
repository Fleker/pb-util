/**
 * Matches a JSON object.
 */
export type JsonObject = {[key: string]: JsonValue};

/**
 * Matches a JSON array.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface JsonArray extends Array<JsonValue> {}

/**
 * Matches any valid JSON value.
 */
export type JsonValue = string|number|boolean|null|JsonObject|JsonArray;

/**
 * @typedef {Object} Value
 * @property {string} kind The kind of value. Valid values for this fields are
 *     - `nullValue`
 *     - `numberValue`
 *     - `stringValue`
 *     - `boolValue`
 *     - `structValue`
 *     - `listValue`
 * @property {number} [nullValue] Represents a null value, actual field value
 *     should be `0`.
 * @property {number} [numberValue] Represents a number.
 * @property {string} [stringValue] Represents a string.
 * @property {boolean} [boolValue] Represents a boolean.
 * @property {Struct} [structValue] Represents an object.
 * @property {ListValue} [listValue] Represents an array of values.
 */
export interface Value {
  kind?: string;
  nullValue?: number;
  numberValue?: number;
  stringValue?: string;
  boolValue?: boolean;
  structValue?: Struct;
  listValue?: ListValue;
}

/**
 * @typedef {Object} Struct
 * @property {Object.<string, Value>} fields The struct fields.
 */
export interface Struct {
  fields?: {[key: string]: Value};
}

/**
 * @typedef {Object} ListValue
 * @property {Value[]} values The list values.
 */
export interface ListValue {
  values?: Value[];
}

const toString = Object.prototype.toString;

const encoders = {
  [typeOf({})]: v => wrap('structValue', struct.encode(v)),
  [typeOf([])]: v => wrap('listValue', list.encode(v)),
  [typeOf(0)]: v => wrap('numberValue', v),
  [typeOf('')]: v => wrap('stringValue', v),
  [typeOf(true)]: v => wrap('boolValue', v),
  [typeOf(null)]: () => wrap('nullValue', 0)
};

function typeOf(value: JsonValue): string {
  return toString.call(value);
}

function wrap(kind: keyof Value, value): Value {
  return {kind, [kind]: value};
}

/**
 * Used to encode/decode {@link Value} objects.
 */
export const value = {
  /**
   * Encodes a JSON value into a protobuf {@link Value}.
   *
   * @param {*} value The JSON value.
   * @returns {Value}
   */
  encode(value: JsonValue): Value {
    const type = typeOf(value);
    const encoder = encoders[type];
    if (typeof encoder !== 'function') {
      throw new TypeError(`Unable to infer type for "${value}".`);
    }
    return encoder(value);
  },
  /**
   * Decodes a protobuf {@link Value} into a JSON value.
   *
   * @param {Value} value the protobuf value.
   * @returns {*}
   */
  decode(value: Value): JsonValue {
    if (value.listValue) {
      return list.decode(value.listValue);
    }
    if (value.structValue) {
      return struct.decode(value.structValue);
    }
    if (typeof value.nullValue !== 'undefined') {
      return null;
    }
    return value[value.kind] as JsonValue;
  }
};

/**
 * Used to encode/decode {@link Struct} objects.
 */
export const struct = {
  /**
   * Encodes a JSON object into a protobuf {@link Struct}.
   *
   * @param {Object.<string, *>} value the JSON object.
   * @returns {Struct}
   */
  encode(json: JsonObject): Struct {
    const fields = {};
    Object.keys(json).forEach(key => {
      // If value is undefined, do not encode it.
      if (!json[key]) return;
      fields[key] = value.encode(json[key]);
    });
    return {fields};
  },
  /**
   * Decodes a protobuf {@link Struct} into a JSON object.
   *
   * @param {Struct} struct the protobuf struct.
   * @returns {Object.<string, *>}
   */
  decode({fields}: Struct): JsonObject {
    const json = {};
    Object.keys(fields).forEach(key => {
      json[key] = value.decode(fields[key]);
    });
    return json;
  }
};

/**
 * Used to encode/decode {@link ListValue} objects.
 */
export const list = {
  /**
   * Encodes an array of JSON values into a protobuf {@link ListValue}.
   *
   * @param {Array.<*>} values the JSON values.
   * @returns {ListValue}
   */
  encode(values: JsonArray): ListValue {
    return {
      values: values.map(value.encode)
    };
  },
  /**
   * Decodes a protobuf {@link ListValue} into an array of JSON values.
   *
   * @param {ListValue} list the protobuf list value.
   * @returns {Array.<*>}
   */
  decode({values}: ListValue): JsonArray {
    return values.map(value.decode);
  }
};
