const RING_BUFF_SIZE = 4096;
const F = 18;
const THRESHOLD = 2;

export function lzssDecompress(
  origSourceOriginalPtr: DataView,
  destOriginalPointer: DataView,
) {
  console.log(destOriginalPointer);
  let i, j, k, r: number;
  const textBuffer = new DataView(new ArrayBuffer(RING_BUFF_SIZE + F - 1)); //Len - RING_BUFF_SIZE + F - 1
  let flags: number;
  //*2 because shorts are 2 bytes
  //const lson = new DataView(new ArrayBuffer((RING_BUFF_SIZE + 1) * 2));
  //const rson = new DataView(new ArrayBuffer((RING_BUFF_SIZE + 157) * 2));
  //const dad = new DataView(new ArrayBuffer((RING_BUFF_SIZE + 1) * 2));
  let c: number;

  let sourceSize = origSourceOriginalPtr.byteLength;
  const sourceOriginalPtr = new DataView(new ArrayBuffer(sourceSize + 1));

  //Copy buffers over
  for (i = 0; i < sourceSize; i++) {
    sourceOriginalPtr.setUint8(i, origSourceOriginalPtr.getUint8(i));
  }

  //let sourceOriginalPtr = new DataView(new ArrayBuffer(sourceSize + 1));
  let destPtr = 0; //Buffer offset
  let sourcePtr = 0; //Buffer offset

  for (i = 0; i < RING_BUFF_SIZE - F; i++)
    textBuffer.setInt8(i, " ".charCodeAt(0));

  r = RING_BUFF_SIZE - F;
  flags = 0;

  try {
    for (;;) {
      flags = Math.floor(flags / 2);
      if (flags < 256) {
        if (--sourceSize < 0) break;
        c = sourceOriginalPtr.getUint8(sourcePtr++);
        flags = c | 0xff00;
      }

      if (flags & 1) {
        if (--sourceSize < 0) break;
        c = sourceOriginalPtr.getUint8(sourcePtr++);

        destOriginalPointer.setUint8(destPtr++, c);
        //if (c !== 0) console.log("SETTING DEST", destPtr, c);

        textBuffer.setUint8(r++, c);

        r &= RING_BUFF_SIZE - 1;
      } else {
        if (--sourceSize < 0) break;
        i = sourceOriginalPtr.getUint8(sourcePtr++);

        if (--sourceSize < 0) break;
        j = sourceOriginalPtr.getUint8(sourcePtr++);

        i |= (j & 0xf0) << 4;
        j = (j & 0x0f) + THRESHOLD;
        for (k = 0; k <= j; k++) {
          c = textBuffer.getUint8((i + k) & (RING_BUFF_SIZE - 1));
          //if (c !== 0) console.log("SETTING DEST", destPtr, c);
          destOriginalPointer.setUint8(destPtr++, c);
          textBuffer.setUint8(r++, c);
          r &= RING_BUFF_SIZE - 1;
        }
      }
    }
  } catch (e) {
    console.log(e);
    console.log("srcSize", sourceSize);
  }
  console.log("textBuffer", textBuffer);
  console.log(destOriginalPointer, "destOriginalPointer");
}

export function lzssCompress() {}

/* 
OTTO MATIC SOURCE CODE:

#define RING_BUFF_SIZE		 		4096			 size of ring buffer 
#define F		   		18							 upper limit for match_length 
#define THRESHOLD		2   						 encode string into position and length if match_length is greater than this 
#define LZSS_NIL		RING_BUFF_SIZE				 index for root of binary search trees 

long LZSS_Decode(short fRefNum, Ptr destPtr, long sourceSize)
{
short  		i, j, k, r;
unsigned short  flags;
Ptr			srcOriginalPtr;
unsigned char *sourcePtr,c;
Ptr			initialDestPtr = destPtr;

				// GET MEMORY FOR LZSS DATA 

	// ring buffer of size N, with extra F-1 bytes to facilitate string comparison
	uint8_t	*textBuffer	= (uint8_t*)AllocPtr(RING_BUFF_SIZE + F - 1);

	// left & right children & parents -- These constitute binary search trees.
	short	*lson		= (short *)AllocPtr(sizeof(short) * (RING_BUFF_SIZE + 1));
	short	*rson		= (short *)AllocPtr(sizeof(short) * (RING_BUFF_SIZE + 257));
	short	*dad		= (short *)AllocPtr(sizeof(short) * (RING_BUFF_SIZE + 1));

	// ZS pack buffer
	srcOriginalPtr = (Ptr)AllocPtr(sourceSize+1);

	sourcePtr = (unsigned char *)srcOriginalPtr;

	GAME_ASSERT(textBuffer);
	GAME_ASSERT(lson);
	GAME_ASSERT(rson);
	GAME_ASSERT(dad);
	GAME_ASSERT(srcOriginalPtr);

				// READ LZSS DATA 

	FSRead(fRefNum,&sourceSize,srcOriginalPtr);



					// DECOMPRESS IT 

	for (i = 0; i < (RING_BUFF_SIZE - F); i++)						// clear buff to "default char"? (BLG)
		textBuffer[i] = ' ';

	r = RING_BUFF_SIZE - F;
	flags = 0;
	for ( ; ; )
	{
		if (((flags >>= 1) & 256) == 0)
		{
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			c = *sourcePtr++;					// get a source byte
			flags = (unsigned short)c | 0xff00;							// uses higher byte cleverly
		}
													// to count eight
		if (flags & 1)
		{
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			c = *sourcePtr++;					// get a source byte
			*destPtr++ = c;
			textBuffer[r++] = c;
			r &= (RING_BUFF_SIZE - 1);
		}
		else
		{
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			i = *sourcePtr++;					// get a source byte
			if (--sourceSize < 0)				// see if @ end of source data
				break;
			j = *sourcePtr++;					// get a source byte

			i |= ((j & 0xf0) << 4);
			j = (j & 0x0f) + THRESHOLD;
			for (k = 0; k <= j; k++)
			{
				c = textBuffer[(i + k) & (RING_BUFF_SIZE - 1)];
				*destPtr++ = c;
				textBuffer[r++] = c;
				r &= (RING_BUFF_SIZE - 1);
			}
		}
	}

	size_t decompSize = destPtr - initialDestPtr;		// calc size of decompressed data


			// CLEANUP 

	SafeDisposePtr(srcOriginalPtr);				// release the memory for packed buffer
	SafeDisposePtr((Ptr)textBuffer);
	SafeDisposePtr((Ptr)lson);
	SafeDisposePtr((Ptr)rson);
	SafeDisposePtr((Ptr)dad);

	return (long) decompSize;
}


*/
