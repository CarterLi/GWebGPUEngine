import { createEntity } from '..';
import { ComponentManager } from '../ComponentManager';
import { TestComponent } from './fixtures/test';

describe('Component', () => {
  let testComponentManager: ComponentManager<TestComponent>;

  beforeEach(() => {
    testComponentManager = new ComponentManager(TestComponent);
  });

  it('should attach a component to entity successfully.', () => {
    const entity = createEntity();

    testComponentManager.create(entity, {
      prop1: 1,
      prop2: 'test',
    });

    expect(testComponentManager.contains(entity)).toBe(true);
    expect(testComponentManager.getCount()).toBe(1);

    expect(testComponentManager.getComponentByEntity(entity)?.prop1).toBe(1);
    expect(testComponentManager.getComponentByEntity(entity)?.prop2).toBe(
      'test',
    );
  });

  it('should remove component from entity successfully.', () => {
    const entity1 = createEntity();
    const entity2 = createEntity();

    testComponentManager.create(entity1, {
      prop1: 1,
      prop2: 'test1',
    });

    testComponentManager.create(entity2, {
      prop1: 2,
      prop2: 'test2',
    });

    expect(testComponentManager.getCount()).toBe(2);

    testComponentManager.remove(entity2);
    expect(testComponentManager.getCount()).toBe(1);
    expect(testComponentManager.getComponentByEntity(entity1)?.prop1).toBe(1);
    expect(testComponentManager.getComponentByEntity(entity2)).toBe(null);

    testComponentManager.remove(entity1);
    expect(testComponentManager.getCount()).toBe(0);
    expect(testComponentManager.getComponentByEntity(entity1)).toBe(null);
  });
});
