import { mat4, quat, vec3 } from 'gl-matrix';
import { AABB } from '../AABB';
import { BoundingSphere } from '../BoundingSphere';
import { Plane } from '../Plane';
import { Ray } from '../Ray';

describe('Ray', () => {
  test('should intersect with plane.', () => {
    const plane = new Plane(0, vec3.fromValues(0, 1, 0));
    let ray = new Ray(vec3.fromValues(0, 10, 0), vec3.fromValues(0, -1, 0));

    const intersection = vec3.create();
    let intersects = ray.intersectsPlane(plane, intersection);
    expect(intersects).toBeTruthy();
    expect(intersection).toStrictEqual(vec3.fromValues(0, 0, 0));

    ray = new Ray(vec3.fromValues(10, 10, 0), vec3.fromValues(0, -1, 0));
    intersects = ray.intersectsPlane(plane, intersection);
    expect(intersects).toBeTruthy();
    expect(intersection).toStrictEqual(vec3.fromValues(10, 0, 0));
  });

  test('should not intersect with a parallel plane.', () => {
    const plane = new Plane(0, vec3.fromValues(0, 1, 0));
    const ray = new Ray(vec3.fromValues(0, 10, 0), vec3.fromValues(1, 0, 0));

    const intersection = vec3.create();
    const intersects = ray.intersectsPlane(plane, intersection);
    expect(intersects).toBeFalsy();
    expect(intersection).toStrictEqual(vec3.create());
  });

  test('should intersect with a bounding sphere.', () => {
    const ray = new Ray(vec3.fromValues(0, 10, 0), vec3.fromValues(0, -1, 0));
    const sphere1 = new BoundingSphere();
    const sphere2 = new BoundingSphere(vec3.fromValues(1, 0, 0));

    const intersection = vec3.create();
    let intersects = ray.intersectsSphere(sphere1, intersection);
    expect(intersects).toBeTruthy();
    expect(intersection).toStrictEqual(vec3.fromValues(0, 0.5, 0));

    intersects = ray.intersectsSphere(sphere2, intersection);
    expect(intersects).toBeFalsy();
  });
});
