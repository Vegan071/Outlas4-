declare module 'yuka' {
  export class Vector3 {
    x: number;
    y: number;
    z: number;
    constructor(x?: number, y?: number, z?: number);
    set(x: number, y: number, z: number): this;
  }

  export class GameEntity {
    position: Vector3;
    boundingRadius: number;
  }

  export class EntityManager {
    add(entity: GameEntity): this;
    update(delta: number): void;
  }

  export class SteeringBehavior {
    weight: number;
  }

  export class SteeringManager {
    add(behavior: SteeringBehavior): this;
  }

  export class Vehicle extends GameEntity {
    maxSpeed: number;
    maxForce: number;
    velocity: Vector3;
    steering: SteeringManager;
  }

  export class WanderBehavior extends SteeringBehavior {
    constructor(radius?: number, distance?: number, jitter?: number);
  }

  export class SeekBehavior extends SteeringBehavior {
    target: Vector3;
    constructor(target: Vector3);
  }

  export class ObstacleAvoidanceBehavior extends SteeringBehavior {
    dBoxMinLength: number;
    constructor(obstacles: GameEntity[]);
  }
}
