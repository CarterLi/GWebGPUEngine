import { Parser, Target } from '@antv/g-webgpu-compiler';
import { vec3 } from 'gl-matrix';
import { inject, injectable } from 'inversify';
import {
  Component,
  container,
  createEntity,
  Entity,
  IRenderEngine,
} from '../..';
import { ComponentManager } from '../../ComponentManager';
import { IDENTIFIER } from '../../identifier';
import { ISystem } from '../../ISystem';
import { ComputeComponent, ComputeType } from './ComputeComponent';
import { IComputeStrategy } from './IComputeStrategy';

@injectable()
export class ComputeSystem implements ISystem {
  @inject(IDENTIFIER.ComputeComponentManager)
  private readonly compute: ComponentManager<ComputeComponent>;

  @inject(IDENTIFIER.RenderEngine)
  private readonly engine: IRenderEngine;

  private parser: Parser = new Parser();

  public async execute() {
    await Promise.all(
      this.compute.map(async (entity, component) => {
        if (!component.finished) {
          if (component.dirty) {
            await this.compile(component);
            component.strategy.init(component.compiledBundle.context);
            component.dirty = false;
          }

          if (component.iteration <= component.maxIteration - 1) {
            this.engine.setComputePipeline(`compute-${entity}`, {
              layout: component.pipelineLayout,
              ...component.stageDescriptor,
            });
            this.engine.setComputeBindGroups([
              component.strategy.getBindingGroup(),
            ]);

            component.strategy.run();
          } else {
            component.finished = true;
            if (component.onCompleted) {
              component.onCompleted(
                await this.engine.readData(component.compiledBundle.context),
              );
            }
          }
        }
      }),
    );
  }

  public tearDown() {
    this.compute.forEach((_, compute) => {
      compute.strategy.destroy();
    });
    this.compute.clear();
  }

  public createComputePipeline({
    type = 'layout',
    shader,
    precompiled = false,
    dispatch = [1, 1, 1],
    maxIteration = 1,
    onCompleted = null,
  }: {
    type: ComputeType;
    shader: string;
    precompiled?: boolean;
    dispatch: [number, number, number];
    maxIteration?: number;
    onCompleted?: ((particleData: ArrayBufferView) => void) | null;
  }) {
    const entity = createEntity();
    const strategy = container.getNamed<IComputeStrategy>(
      IDENTIFIER.ComputeStrategy,
      type,
    );

    this.compute.create(entity, {
      type,
      strategy,
      rawShaderCode: shader,
      precompiled,
      dispatch,
      maxIteration,
      onCompleted,
    });

    strategy.component = this.compute.getComponentByEntity(entity)!;

    return entity;
  }

  public setBinding(
    entity: Entity,
    name: string,
    data: ArrayBufferView | number[] | number,
  ) {
    const compute = this.compute.getComponentByEntity(entity);

    if (compute) {
      compute.bindings.push({
        name,
        data,
      });
    }
  }

  public getParticleBuffer(entity: Entity) {
    const compute = this.compute.getComponentByEntity(entity)!;
    return compute.strategy.getGPUBuffer();
  }

  public getPrecompiledBundle(entity: Entity): string {
    const component = this.compute.getComponentByEntity(entity)!;
    Object.keys(component.compiledBundle.shaders).forEach((target) => {
      // @ts-ignore
      if (!component.compiledBundle.shaders[target]) {
        this.parser.setTarget(target as Target);
        // @ts-ignore
        component.compiledBundle.shaders[target] = this.parser.generateCode(
          this.parser.parse(component.rawShaderCode)!,
          {
            dispatch: component.dispatch,
            maxIteration: component.maxIteration,
            // @ts-ignore
            bindings: component.bindings,
          },
        );
        this.parser.clear();
      }
    });

    // 需要剔除掉不可序列化的内容，例如上下文中保存的数据
    component.compiledBundle.context.uniforms.forEach((uniform) => {
      if (uniform.data) {
        delete uniform.data;
      }
    });
    return JSON.stringify(component.compiledBundle).replace(/\\n/g, '\\\\n');
  }

  private async compile(
    component: Component<ComputeComponent> & ComputeComponent,
  ) {
    if (!component.precompiled) {
      const target = this.engine.supportWebGPU ? Target.WebGPU : Target.WebGL;
      this.parser.setTarget(target);
      component.compiledBundle = {
        shaders: {
          [Target.WebGPU]: '',
          [Target.WebGL]: '',
        },
        context: this.parser.getGLSLContext(),
      };
      component.compiledBundle.shaders[target] = this.parser.generateCode(
        this.parser.parse(component.rawShaderCode)!,
        {
          dispatch: component.dispatch,
          maxIteration: component.maxIteration,
          // @ts-ignore
          bindings: component.bindings,
        },
      );
    } else {
      // 预编译的结果应该包含所有目标平台的 GLSL 代码
      component.compiledBundle = JSON.parse(component.rawShaderCode);
      // 添加 uniform 绑定的数据
      component.compiledBundle.context.uniforms.forEach((uniform) => {
        const binding = component.bindings.find((b) => b.name === uniform.name);
        if (binding && binding.data) {
          // @ts-ignore
          uniform.data = binding.data;
        }
      });
    }

    component.stageDescriptor = await this.engine.compileComputePipelineStageDescriptor(
      // 添加运行时 define 常量
      `${component.compiledBundle.context.defines
        .filter((define) => define.runtime)
        .map((define) => `#define ${define.name} ${define.value}`)
        .join('\n')}
      ${
        component.compiledBundle.shaders[
          this.engine.supportWebGPU ? Target.WebGPU : Target.WebGL
        ]
      }`,
      component.compiledBundle.context,
    );

    if (!component.precompiled) {
      this.parser.clear();
    }
    component.precompiled = true;
  }
}