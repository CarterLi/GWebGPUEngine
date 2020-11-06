import { inject, injectable } from 'inversify';
import { IDENTIFIER } from '../../../identifier';
import copyFrag from '../../../services/shader-module/shaders/webgl.copy.frag.glsl';
import copyVert from '../../../services/shader-module/shaders/webgl.copy.vert.glsl';
import copyFragWebGPU from '../../../services/shader-module/shaders/webgpu.copy.frag.glsl';
import copyVertWebGPU from '../../../services/shader-module/shaders/webgpu.copy.vert.glsl';
import { FrameGraphHandle } from '../../framegraph/FrameGraphHandle';
import { FrameGraphPass } from '../../framegraph/FrameGraphPass';
import { PassNode } from '../../framegraph/PassNode';
import { ResourcePool } from '../../framegraph/ResourcePool';
import { FrameGraphSystem } from '../../framegraph/System';
import { gl } from '../gl';
import { IModel } from '../IModel';
import { IRendererService } from '../IRendererService';
import { IRenderPass } from './IRenderPass';
import { RenderPass, RenderPassData } from './RenderPass';

export interface CopyPassData {
  input: FrameGraphHandle;
  output: FrameGraphHandle;
}

@injectable()
export class CopyPass implements IRenderPass<CopyPassData> {
  public static IDENTIFIER = 'Copy Pass';

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRendererService;

  @inject(IDENTIFIER.ResourcePool)
  private readonly resourcePool: ResourcePool;

  private model: IModel | undefined;

  public setup = (
    fg: FrameGraphSystem,
    passNode: PassNode,
    pass: FrameGraphPass<CopyPassData>,
  ): void => {
    const renderPass = fg.getPass<RenderPassData>(RenderPass.IDENTIFIER);
    if (renderPass) {
      const output = fg.createRenderTarget(passNode, 'render to screen', {
        width: 1,
        height: 1,
      });

      pass.data = {
        input: passNode.read(renderPass.data.output),
        output: passNode.write(fg, output),
      };
    }
  };

  public execute = async (
    fg: FrameGraphSystem,
    pass: FrameGraphPass<CopyPassData>,
  ): Promise<void> => {
    const { createModel, createAttribute, createBuffer } = this.engine;

    if (!this.model) {
      const model = await createModel({
        vs: this.engine.supportWebGPU ? copyVertWebGPU : copyVert,
        fs: this.engine.supportWebGPU ? copyFragWebGPU : copyFrag,
        attributes: {
          // rendering a fullscreen triangle instead of quad
          // @see https://www.saschawillems.de/blog/2016/08/13/vulkan-tutorial-on-rendering-a-fullscreen-quad-without-buffers/
          a_Position: createAttribute({
            buffer: createBuffer({
              data: [-4, -4, 4, -4, 0, 4],
              type: gl.FLOAT,
            }),
            size: 2,
            arrayStride: 2 * 4,
            stepMode: 'vertex',
            attributes: [
              {
                shaderLocation: 0,
                offset: 0,
                format: 'float2',
              },
            ],
          }),
        },
        uniforms: {
          // @ts-ignore
          u_Texture: null,
        },
        depth: {
          enable: false,
        },
        count: 3,
        blend: {
          // copy pass 需要混合
          // enable: this.getName() === 'copy',
          enable: true,
        },
      });
      this.model = model;
    }

    // 实例化资源
    const resourceNode = fg.getResourceNode(pass.data.input);
    const framebuffer = this.resourcePool.getOrCreateResource(
      resourceNode.resource,
    );

    this.engine.useFramebuffer(null, () => {
      this.engine.clear({
        framebuffer: null,
        color: [0, 0, 0, 0],
        depth: 1,
        stencil: 0,
      });
      this.model!.draw({
        uniforms: {
          u_Texture: framebuffer,
          // u_ViewportSize: [width, height],
        },
      });
    });
  };

  public tearDown = () => {
    this.model = undefined;
  };
}
