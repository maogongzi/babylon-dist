define('dataview', function () {
    // check if it's natively supported.
    var _DataView = DataView;

    if (_DataView) {
        return _DataView;
    }

    _DataView = function (buffer, byteOffset, byteLength) {
        this.buffer = buffer;
        this.byteOffset = byteOffset || 0;
        this.byteLength = byteLength || buffer.byteLength || buffer.length;
        this._isString = typeof buffer === "string";
    }

    _DataView.prototype = {
        constructor: _DataView,

        _getCharCodes: function (buffer,start,length) {
            start = start || 0;
            length = length || buffer.length;
            var end = start + length;
            var codes = [];
            for (var i = start; i < end; i ++) {
                codes.push(buffer.charCodeAt(i) & 0xff);
            }
            return codes;
        },

        _getBytes: function (length, byteOffset, littleEndian) {
            var result;

            
            if (littleEndian === undefined) {

                littleEndian = this._littleEndian;

            }

        
            if (byteOffset === undefined) {

                byteOffset = this.byteOffset;

            } else {

                byteOffset = this.byteOffset + byteOffset;

            }

            if (length === undefined) {

                length = this.byteLength - byteOffset;

            }

            
            if (typeof byteOffset !== 'number') {

                throw new TypeError('DataView byteOffset is not a number');

            }

            if (length < 0 || byteOffset + length > this.byteLength) {

                throw new Error('DataView length or (byteOffset+length) value is out of bounds');

            }

            if (this.isString) {

                result = this._getCharCodes(this.buffer, byteOffset, byteOffset + length);

            } else {

                result = this.buffer.slice(byteOffset, byteOffset + length);

            }

            if (!littleEndian && length > 1) {

                if (!(result instanceof Array)) {

                    result = Array.prototype.slice.call(result);

                }

                result.reverse();
            }

            return result;
        },

        getFloat64: function (byteOffset, littleEndian) {
            var b = this._getBytes(8, byteOffset, littleEndian),

                sign = 1 - (2 * (b[7] >> 7)),
                exponent = ((((b[7] << 1) & 0xff) << 3) | (b[6] >> 4)) - ((1 << 10) - 1),

            
                mantissa = ((b[6] & 0x0f) * Math.pow(2, 48)) + (b[5] * Math.pow(2, 40)) + (b[4] * Math.pow(2, 32)) +
                            (b[3] * Math.pow(2, 24)) + (b[2] * Math.pow(2, 16)) + (b[1] * Math.pow(2, 8)) + b[0];

            if (exponent === 1024) {
                if (mantissa !== 0) {
                    return NaN;
                } else {
                    return sign * Infinity;
                }
            }

            if (exponent === -1023) { 
                return sign * mantissa * Math.pow(2, -1022 - 52);
            }

            return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);
        },

        getFloat32: function (byteOffset, littleEndian) {
            var b = this._getBytes(4, byteOffset, littleEndian),

                sign = 1 - (2 * (b[3] >> 7)),
                exponent = (((b[3] << 1) & 0xff) | (b[2] >> 7)) - 127,
                mantissa = ((b[2] & 0x7f) << 16) | (b[1] << 8) | b[0];

            if (exponent === 128) {
                if (mantissa !== 0) {
                    return NaN;
                } else {
                    return sign * Infinity;
                }
            }

            if (exponent === -127) { 
                return sign * mantissa * Math.pow(2, -126 - 23);
            }

            return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
        },

        getInt32: function (byteOffset, littleEndian) {
            var b = this._getBytes(4, byteOffset, littleEndian);
            return (b[3] << 24) | (b[2] << 16) | (b[1] << 8) | b[0];
        },

        getUint32: function (byteOffset, littleEndian) {
            return this.getInt32(byteOffset, littleEndian) >>> 0;
        },

        getInt16: function (byteOffset, littleEndian) {
            return (this.getUint16(byteOffset, littleEndian) << 16) >> 16;
        },

        getUint16: function (byteOffset, littleEndian) {
            var b = this._getBytes(2, byteOffset, littleEndian);
            return (b[1] << 8) | b[0];
        },

        getInt8: function (byteOffset) {
            return (this.getUint8(byteOffset) << 24) >> 24;
        },

        getUint8: function (byteOffset) {
            return this._getBytes(1, byteOffset)[0];
        }
    };

    return _DataView;
});


define([
    'babylon',
    'dataview',
], function (
    BABYLON,
    DataView
) {
    'use strict';

    return {
        parseBinary: function (arrBuf) {
            var reader = new DataView(arrBuf),
                indices = [],
                indicesCount = 0,

                // skip header size
                headerBytes = 80,
                offset = headerBytes,

                triangleCount = null,

                positions = [],
                normals = [],
                
                position,
                normal,

                i, j;

            triangleCount = reader.getUint32(offset, true);
            offset += 4;

            // extract vertices and normal vectors.
            // each triangle takes 50 bytes(4*3 + 4*3*3 + 2)
            for(i=0; i<triangleCount; i++) {
              normal = [
                reader.getFloat32(offset, true),
                reader.getFloat32(offset + 8, true),
                reader.getFloat32(offset + 4, true)
              ];

              // 3 floats
              offset += 12;

              for(j=0; j<3; j++) {
                position = [
                    reader.getFloat32(offset, true),
                    reader.getFloat32(offset + 8, true),
                    reader.getFloat32(offset + 4, true)
                ];

                offset += 12;

                // each vertex has it's own normal vector!!!
                // but on the same facet, the 3 vertices share the same normal vector.
                positions.push.apply(positions, position);
                normals.push.apply(normals, normal);
              }

              indices.push(indicesCount++, indicesCount++, indicesCount++);

              // skip attribute byte count
              offset += 2;
            }

            return {
                positions: positions,
                normals: normals,
                indices: indices
            }
        }
    };
});
