import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import type { Scene } from '@babylonjs/core/scene';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import '@babylonjs/loaders/glTF';

export class AssetLoader {
  constructor(private readonly scene: Scene) {}

  async loadModel(rootUrl: string, fileName: string): Promise<AbstractMesh[]> {
    const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene);
    return result.meshes;
  }
}
