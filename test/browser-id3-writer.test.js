function typedArray2Array(typedArray) {
    return Array.prototype.slice.call(typedArray);
}

describe('ID3Writer', () => {

    it('should be possible to create an instance', () => {
        const buffer = new ArrayBuffer(0);
        const writer = new ID3Writer(buffer);

        expect(writer).to.be.instanceof(ID3Writer);
    });

    it('should throw an exception if no argument passed to constructor', () => {
        expect(() => {
            const writer = new ID3Writer();

            writer.setFrame('USLT', 'Lyrics');
        }).to.throw(Error, 'First argument should be an instance of ArrayBuffer');
    });

    it('wrong frame value type should throw an exception', () => {
        const frames = ['TPE1', 'TCOM', 'TCON'];
        const buffer = new ArrayBuffer(0);
        const writer = new ID3Writer(buffer);

        frames.forEach((frameName) => {
            expect(() => {
                writer.setFrame(frameName, '');
            }).to.throw(Error, 'frame value should be an array of strings');
            expect(writer.setFrame(frameName, [])).to.be.instanceof(ID3Writer);
        });
    });

    it('set incorrect frame name should throw an exception', () => {
        const buffer = new ArrayBuffer(0);
        const writer = new ID3Writer(buffer);

        expect(() => {
            writer.setFrame('wrongFrameName', 'val');
        }).to.throw(Error, 'Unsupported frame');
    });

    it('should set USLT frame', () => {
        const lyrics = 'Вышел заяц на крыльцо. Rabbit went out.';
        const writer = new ID3Writer(new ArrayBuffer(0));

        writer.setFrame('USLT', lyrics);

        const buffer = writer.addTag();
        const coder16 = new TextEncoder('utf-16le');
        const frameTotalSize = lyrics.length * 2 + 16;
        const bufferUint8 = new Uint8Array(buffer, 10, frameTotalSize);

        expect(bufferUint8).to.eql(new Uint8Array([
                85, 83, 76, 84, // 'USLT'
                0, 0, 0, frameTotalSize - 10, // size without header (should be less than 128)
                0, 0, // flags
                1, // encoding
                101, 110, 103, // language
                0, 0 // content descriptor
            ].concat(typedArray2Array(coder16.encode(lyrics)))
        ));
    });

    describe('APIC', () => {

        it('should throw error when mime type is not detected', () => {
            const writer = new ID3Writer(new ArrayBuffer(0));

            expect(() => {
                writer.setFrame('APIC', new ArrayBuffer(20));
            }).to.throw(Error, 'Unknown picture MIME type');
        });

        it('should throw error when buffer is empty', () => {
            const writer = new ID3Writer(new ArrayBuffer(0));

            expect(() => {
                writer.setFrame('APIC', new ArrayBuffer(0));
            }).to.throw(Error, 'Unknown picture MIME type');
        });

        it('should accept various image types', () => {
            const types = [
                { // jpeg
                    signature: [0xff, 0xd8, 0xff],
                    mime: [105, 109, 97, 103, 101, 47, 106, 112, 101, 103]
                },
                { // png
                    signature: [0x89, 0x50, 0x4e, 0x47],
                    mime: [105, 109, 97, 103, 101, 47, 112, 110, 103]
                },
                { // gif
                    signature: [0x47, 0x49, 0x46],
                    mime: [105, 109, 97, 103, 101, 47, 103, 105, 102]
                },
                { // webp
                    signature: [0, 0, 0, 0, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50],
                    mime: [105, 109, 97, 103, 101, 47, 119, 101, 98, 112]
                },
                { // tiff LE
                    signature: [0x49, 0x49, 0x2a, 0],
                    mime: [105, 109, 97, 103, 101, 47, 116, 105, 102, 102]
                },
                { // tiff BE
                    signature: [0x4d, 0x4d, 0, 0x2a],
                    mime: [105, 109, 97, 103, 101, 47, 116, 105, 102, 102]
                },
                { // bmp
                    signature: [0x42, 0x4d],
                    mime: [105, 109, 97, 103, 101, 47, 98, 109, 112]
                },
                { // ico
                    signature: [0, 0, 1, 0],
                    mime: [105, 109, 97, 103, 101, 47, 120, 45, 105, 99, 111, 110]
                }
            ];
            const content = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

            types.forEach((type) => {
                const coverBuffer = new ArrayBuffer(type.signature.length + content.length);
                const coverUint8 = new Uint8Array(coverBuffer);

                coverUint8.set(type.signature);
                coverUint8.set(content, type.signature.length);

                const writer = new ID3Writer(new ArrayBuffer(0));

                writer.setFrame('APIC', coverBuffer);

                const buffer = writer.addTag();
                const frameTotalSize = type.mime.length + type.signature.length + content.length + 14;
                const bufferUint8 = new Uint8Array(buffer, 10, frameTotalSize);

                expect(bufferUint8).to.eql(new Uint8Array([
                        65, 80, 73, 67, // 'APIC'
                        0, 0, 0, frameTotalSize - 10, // size without header (should be less than 128)
                        0, 0, // flags
                        0 // encoding
                    ].concat(type.mime)
                    .concat([0, 3, 0]) // delemiter, pic type, delemiter
                    .concat(type.signature)
                    .concat(content)
                ));
            });
        });

    });

});
