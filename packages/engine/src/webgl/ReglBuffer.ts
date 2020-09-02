import {
  BufferData,
  gl,
  IBuffer,
  IBufferInitializationOptions,
} from '@antv/g-webgpu-core';
import regl from 'regl';
import { dataTypeMap, usageMap } from './constants';

/**
 * adaptor for regl.Buffer
 * @see https://github.com/regl-project/regl/blob/gh-pages/API.md#buffers
 */
export default class ReglBuffer implements IBuffer {
  private buffer: regl.Buffer;

  constructor(reGl: regl.Regl, options: IBufferInitializationOptions) {
    const { data, usage, type } = options;
    // @ts-ignore
    this.buffer = reGl.buffer({
      data,
      usage: usageMap[usage || gl.STATIC_DRAW],
      type: dataTypeMap[type || gl.UNSIGNED_BYTE],
      // length: 0,
    });
  }

  public get() {
    return this.buffer;
  }

  public destroy() {
    this.buffer.destroy();
  }

  public subData({ data, offset }: { data: BufferData; offset: number }) {
    // @ts-ignore
    this.buffer.subdata(data, offset);
  }
}
