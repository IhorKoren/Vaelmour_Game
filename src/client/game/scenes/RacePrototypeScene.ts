import Phaser from "phaser";
import type {
  NetworkPlayerState,
  PlayerDescriptor,
  RoomPlayer,
} from "../../../shared/multiplayer/protocol";
import { RotatingFollowCamera } from "../camera/RotatingFollowCamera";
import { PseudoPerspectiveRenderer } from "../camera/PseudoPerspectiveRenderer";
import type { DrivingConfig } from "../config/drivingConfig";
import { PlayerCar } from "../entities/PlayerCar";
import { RemoteCar } from "../entities/RemoteCar";
import { DrivingEffects } from "../effects/DrivingEffects";
import { SteeringInput } from "../input/SteeringInput";
import { PrototypeTrack } from "../track/PrototypeTrack";
import type { RaceTelemetry, Surface } from "../types";
import { MultiplayerClient } from "../../multiplayer/MultiplayerClient";
import type { MultiplayerRuntimeConfig } from "../../multiplayer/config";
import { resolveWebSocketUrl } from "../../multiplayer/networkEndpoint";
import type { MultiplayerTelemetry } from "../../multiplayer/types";

const TELEMETRY_INTERVAL_MS = 80;

type PendingNetworkEvent =
  | { type: "room-snapshot"; players: RoomPlayer[] }
  | { type: "player-joined"; player: PlayerDescriptor }
  | { type: "player-left"; playerId: string }
  | { type: "player-state"; state: NetworkPlayerState }
  | { type: "reset" };

export class RacePrototypeScene extends Phaser.Scene {
  private car!: PlayerCar;
  private followCamera!: RotatingFollowCamera;
  private perspectiveRenderer!: PseudoPerspectiveRenderer;
  private steeringInput!: SteeringInput;
  private drivingEffects!: DrivingEffects;
  private track!: PrototypeTrack;
  private multiplayerClient!: MultiplayerClient;
  private readonly remoteCars = new Map<string, RemoteCar>();
  private readonly remotePlayers = new Map<string, PlayerDescriptor>();
  private readonly pendingNetworkEvents: PendingNetworkEvent[] = [];
  private acceptsNetworkEvents = false;
  private nextCheckpoint = 1;
  private lap = 1;
  private currentLapMs = 0;
  private bestLapMs: number | null = null;
  private telemetryElapsed = 0;
  private surface: Surface = "TRACK";
  private readonly remoteNameplateAnchor = new Phaser.Math.Vector2();
  private readonly remoteNameplatePosition = new Phaser.Math.Vector2();

  constructor(
    private readonly getDrivingConfig: () => DrivingConfig,
    private readonly getMultiplayerConfig: () => MultiplayerRuntimeConfig,
    private readonly onTelemetry: (telemetry: RaceTelemetry) => void,
    private readonly onMultiplayerTelemetry: (
      telemetry: MultiplayerTelemetry,
    ) => void,
  ) {
    super("race-prototype");
  }

  create() {
    this.acceptsNetworkEvents = true;
    this.track = new PrototypeTrack();
    this.track.draw(this);

    const start = this.track.getStart();
    this.car = new PlayerCar(
      this,
      start.position.x,
      start.position.y,
      start.heading,
    ).setDepth(10);
    this.drivingEffects = new DrivingEffects(this);
    this.steeringInput = new SteeringInput(this);

    this.cameras.main.setBounds(
      0,
      0,
      this.track.worldWidth,
      this.track.worldHeight,
    );
    this.followCamera = new RotatingFollowCamera(
      this.cameras.main,
      this.car,
      this.getDrivingConfig(),
    );
    this.perspectiveRenderer = new PseudoPerspectiveRenderer(
      this,
      this.cameras.main,
      this.followCamera,
      this.car,
    );
    this.multiplayerClient = new MultiplayerClient({
      url: resolveWebSocketUrl(),
      getLocalState: () => ({
        x: this.car.x,
        y: this.car.y,
        rotation: this.car.rotation,
        speed: this.car.velocity.length(),
        velocityX: this.car.velocity.x,
        velocityY: this.car.velocity.y,
      }),
      onRoomSnapshot: (players) =>
        this.queueNetworkEvent({ type: "room-snapshot", players }),
      onPlayerJoined: (player) =>
        this.queueNetworkEvent({ type: "player-joined", player }),
      onPlayerLeft: (playerId) =>
        this.queueNetworkEvent({ type: "player-left", playerId }),
      onPlayerState: (state) =>
        this.queueNetworkEvent({ type: "player-state", state }),
      onReset: () => this.queueNetworkEvent({ type: "reset" }),
      onTelemetry: this.onMultiplayerTelemetry,
    });
    this.multiplayerClient.connect();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.acceptsNetworkEvents = false;
      this.pendingNetworkEvents.length = 0;
      this.steeringInput.destroy();
      this.drivingEffects.destroy();
      this.multiplayerClient.destroy();
      this.clearRemoteCars();
      this.perspectiveRenderer.destroy();
    });
  }

  update(_time: number, deltaMs: number) {
    this.flushNetworkEvents();
    const deltaSeconds = Math.min(deltaMs / 1000, 0.05);
    const drivingConfig = this.getDrivingConfig();
    const steering = this.steeringInput.update(
      deltaSeconds,
      drivingConfig.steeringReturnSpeed,
    );
    const carPosition = new Phaser.Math.Vector2(this.car.x, this.car.y);
    this.surface = this.track.isOnTrack(carPosition) ? "TRACK" : "OFFROAD";
    const speed = this.car.update(
      deltaSeconds,
      steering,
      this.surface,
      drivingConfig,
    );

    this.car.x = Phaser.Math.Clamp(this.car.x, 0, this.track.worldWidth);
    this.car.y = Phaser.Math.Clamp(this.car.y, 0, this.track.worldHeight);
    this.currentLapMs += deltaMs;
    this.telemetryElapsed += deltaMs;
    this.updateCheckpoints(carPosition);
    this.drivingEffects.update(
      deltaMs,
      this.car,
      this.surface,
      steering,
    );
    this.followCamera.update(deltaSeconds, drivingConfig);
    const multiplayerConfig = this.getMultiplayerConfig();
    const renderTime = performance.now();
    for (const remoteCar of this.remoteCars.values()) {
      remoteCar.update(
        renderTime,
        multiplayerConfig.interpolationDelayMs,
        multiplayerConfig.remoteCarOpacity,
      );
    }
    this.perspectiveRenderer.update(drivingConfig);
    for (const remoteCar of this.remoteCars.values()) {
      const anchor = remoteCar.getNameplateAnchor(
        this.remoteNameplateAnchor,
      );
      const projectedPosition = this.perspectiveRenderer.isActive
        ? this.perspectiveRenderer.projectWorldToOverlay(
            anchor.x,
            anchor.y,
            drivingConfig,
            this.remoteNameplatePosition,
          )
        : undefined;
      remoteCar.updateNameplate(
        this.followCamera.rotation,
        projectedPosition,
      );
    }

    if (this.telemetryElapsed >= TELEMETRY_INTERVAL_MS) {
      this.telemetryElapsed = 0;
      this.onTelemetry({
        speedKph: Math.round(speed * 0.36),
        lap: this.lap,
        currentLapMs: this.currentLapMs,
        bestLapMs: this.bestLapMs,
        fps: Math.round(this.game.loop.actualFps),
        steering,
        surface: this.surface,
      });
    }
  }

  private queueNetworkEvent(event: PendingNetworkEvent) {
    if (this.acceptsNetworkEvents) {
      this.pendingNetworkEvents.push(event);
    }
  }

  private flushNetworkEvents() {
    for (const event of this.pendingNetworkEvents.splice(0)) {
      switch (event.type) {
        case "room-snapshot":
          this.handleRoomSnapshot(event.players);
          break;
        case "player-joined":
          this.remotePlayers.set(event.player.playerId, event.player);
          break;
        case "player-left":
          this.removeRemoteCar(event.playerId);
          break;
        case "player-state":
          this.handleRemoteState(event.state);
          break;
        case "reset":
          this.clearRemoteCars();
          break;
      }
    }
  }

  private handleRoomSnapshot(players: RoomPlayer[]) {
    for (const player of players) {
      this.remotePlayers.set(player.playerId, player);
      if (player.state) {
        this.handleRemoteState(player.state);
      }
    }
  }

  private handleRemoteState(state: NetworkPlayerState) {
    let remoteCar = this.remoteCars.get(state.playerId);

    if (!remoteCar) {
      const descriptor = this.remotePlayers.get(state.playerId);
      remoteCar = new RemoteCar(
        this,
        state.playerId,
        descriptor?.color ?? "#47c7ff",
      ).setDepth(9);
      this.remoteCars.set(state.playerId, remoteCar);
      this.perspectiveRenderer.addOverlay(remoteCar.nameplateObject);
    }

    remoteCar.pushSnapshot(state);
  }

  private removeRemoteCar(playerId: string) {
    this.remotePlayers.delete(playerId);
    const remoteCar = this.remoteCars.get(playerId);
    if (remoteCar) {
      this.perspectiveRenderer.removeOverlay(remoteCar.nameplateObject);
    }
    remoteCar?.destroy();
    this.remoteCars.delete(playerId);
  }

  private clearRemoteCars() {
    for (const remoteCar of this.remoteCars.values()) {
      this.perspectiveRenderer.removeOverlay(remoteCar.nameplateObject);
      remoteCar.destroy();
    }
    this.remoteCars.clear();
    this.remotePlayers.clear();
  }

  private updateCheckpoints(carPosition: Phaser.Math.Vector2) {
    const checkpoint = this.track.checkpoints[this.nextCheckpoint];

    if (
      Phaser.Math.Distance.Between(
        carPosition.x,
        carPosition.y,
        checkpoint.position.x,
        checkpoint.position.y,
      ) > checkpoint.radius
    ) {
      return;
    }

    if (this.nextCheckpoint === 0) {
      this.bestLapMs =
        this.bestLapMs === null
          ? this.currentLapMs
          : Math.min(this.bestLapMs, this.currentLapMs);
      this.currentLapMs = 0;
      this.lap += 1;
      this.nextCheckpoint = 1;
      return;
    }

    this.nextCheckpoint =
      (this.nextCheckpoint + 1) % this.track.checkpoints.length;
  }
}
