import Room from "../../util/Room.js";
import { ObjectType } from "../Subpackets/GameDataPackets/Spawn.js";
import PolusBuffer from "../../util/PolusBuffer.js";
import SystemType from "./SystemType.js";
import StateByte, { StateByteInterface } from "./StateByte.js";
import Vector2 from "./Vector2.js";
import AmongUsMap from "../../data/enums/AmongUsMap.js";

interface ComponentData {
	OwnerID: bigint,
	length: number,
	type: number,
	rawData: PolusBuffer
}

enum Components{
	ShipStatus,
	MeetingHud,
	LobbyBehavior,
	GameData,
	VoteBanSystem,
	PlayerControl,
	PhysicsControl,
	CustomTransform
}

interface ShipStatusData{
	system: SystemType,
	data: object
}

interface PlayerControlData{
	new: boolean,
	id: number
}

interface CustomTransformData{
	lastSequenceId: number,
	targetPosition: Vector2,
	targetVelocity: Vector2
}

interface GameDataPlayerData{
	PlayerCount?: number,
	Players: {
		PlayerID: number,
		PlayerName: string,
		Color: bigint,
		HatID: bigint,
		PetID: bigint,
		SkinID: bigint,
		Flags: {
			Disconnected: boolean,
			Impostor: boolean,
			Dead: boolean
		},
		TaskAmount?: number,
		Tasks: {
			TaskID: bigint,
			TaskCompleted: boolean
		}[]
	}[]
}

interface PlayerVoteBanSystem {
	Players: Map<number, bigint[]>,
}

type ComponentDataTyped = | ShipStatusData | StateByteInterface | PlayerControlData | CustomTransformData | GameDataPlayerData | bigint | PlayerVoteBanSystem;

const statusHandler: Map<SystemType, {read: (buffer: PolusBuffer, room: Room) => object, write: (obj: any, buf: PolusBuffer, room: Room) => void}> = new Map();
{
	statusHandler.set(SystemType.Electrical, {
		read: (buf, rm) => {
			return {
				ExpectedSwitches: buf.readU8(),
				ActualSwitches: buf.readU8(),
				Value: buf.readU8()
			};
		},
		write: (obj, buf, rm) => {
			buf.writeU8(obj.ExpectedSwitches);
			buf.writeU8(obj.ActualSwitches);
			buf.writeU8(obj.Value);
		}
	});
	statusHandler.set(SystemType.Medbay, {
		read: (buf, rm) => {
			const length = Number(buf.readVarInt());
			console.log("medbay scan length pepega",length)
			const users = [];
			for(let i=0;i<length;i++)users.push(buf.readU8());
			return {
				Users: users
			}
		},
		write: (obj, buf, rm) => {
			buf.writeVarInt(obj.Users.length)
			for (let i = 0; i < obj.Users.length; i++) {
				buf.writeU8(obj.Users[i])
			}
		}
	});
	statusHandler.set(SystemType.Communications, {
		read:(buf, rm) => {
			return {
				IsSabotaged: buf.readBoolean()
			};
		},
		write: (obj, buf, rm) => {
			buf.writeBoolean(obj.IsSabotaged)
		}
	});
	statusHandler.set(SystemType.Security, {
		read:(buf, rm) => {
			const length = Number(buf.readVarInt());
			const users = [];
			for(let i=0;i<length;i++)users.push(buf.readU8());
			return {
				Users: users
			}
		},
		write: (obj, buf, rm) => {
			buf.writeVarInt(obj.Users.length)
			for (let i = 0; i < obj.Users.length; i++) {
				buf.writeU8(obj.Users[i])
			}
		}
	});
	statusHandler.set(SystemType.Reactor, {
		read: (buf, rm) => {
			const Countdown = buf.readFloat32();
			const length = Number(buf.readVarInt());
			const pairs = new Map();
			for(let i=0;i<length;i++){
				pairs.set(buf.readU8(), buf.readU8());
			}
			return {
				Countdown,
				UserConsolePairs: pairs
			}
		},
		write: (obj, buf, rm) => {
			buf.writeFloat32(obj.Countdown);
			let entries = obj.UserConsolePairs.entries();
			buf.writeVarInt(BigInt(entries.length));
			for (let i = 0; i < entries.length; i++) {
				const entry = entries[i];
				buf.writeU8(entry[0])
				buf.writeU8(entry[1])
			}
		}
	});
	statusHandler.set(SystemType.O2, {
		read: (buf, rm) => {
			const Countdown = buf.readFloat32();
			const length = Number(buf.readVarInt());
			const consoles = [];
			for(let i=0;i<length;i++){
				consoles.push(buf.readU8());
			}
			return {
				Countdown,
				Consoles: consoles
			}
		},
		write: (obj, buf, rm) => {
			buf.writeFloat32(obj.Countdown);
			buf.writeVarInt(obj.Consoles.length);
			for (let i = 0; i < obj.Consoles.length; i++) {
				buf.writeU8(obj.Consoles[i])
			}
		}
	});
	const doorcnts = [13, 0, 12];
	statusHandler.set(SystemType.Doors, {
		read: (buf, rm) => {
			let doors = [];
			for (let i=0;i<13;i++)doors.push(buf.readBoolean());
			return {
				Doors: doors
			}
		},
		write: (obj, buf, rm) => {
			buf.writeVarInt(obj.Doors.length);
			for (let i = 0; i < obj.Consoles.length; i++) {
				buf.writeBoolean(obj.Doors[i])
			}
		}
	});
	statusHandler.set(SystemType.Sabotage, {
		read: (buf, rm) => {
			return {
				Timer: buf.readFloat32()
			}
		},
		write: (obj, buf, rm) => {
			buf.writeFloat32(obj.Timer)
		}
	});
	statusHandler.set(SystemType.Laboratory, statusHandler.get(SystemType.))
}

const skeldSystems = [SystemType.Reactor, SystemType.Electrical, SystemType.O2, SystemType.Medbay, SystemType.Security, SystemType.Communications, SystemType.Doors, SystemType.Sabotage];
const miraSystems = [SystemType.Reactor, SystemType.Electrical, ]

export default class Component {
	netID: bigint;
	length: number;
	type: number;
	rawData: PolusBuffer;
	Type: Components;
	Data: ComponentDataTyped[];

	constructor(private spawnId: bigint, private componentIndex: number, private spawn: boolean, private room: Room, source: PolusBuffer) {
		this.netID = source.readVarInt();
		this.length = source.readU16();
		this.type = source.readU8();
		this.Data = [];
		//todo finish components
		//todo make changes for non-onspawn parsing
		switch(Number(spawnId)){
			case ObjectType.ShipStatus:
			case ObjectType.AprilShipStatus:
			case ObjectType.PlanetMap:
			case ObjectType.HeadQuarters:
				console.log("luv ya cut g",source.dataRemaining());
				this.Type = Components.ShipStatus;


				/// DOD THIS THIS IFUCK FIX THIS 
				room.settings.Map = AmongUsMap.THE_SKELD;
				
				switch(room.settings.Map) {
					case AmongUsMap.THE_SKELD:
						for(let i=0;i<skeldSystems.length;i++){
							this.Data.push(<ShipStatusData>{system:skeldSystems[i],data:statusHandler.get(skeldSystems[i]).read(source, room)});
						}
						break;
					default:
						throw new Error("Map ID: " + room.settings.Map + " not Implemented.");

				}
				break;
			case ObjectType.MeetingHud://do it do what
				this.Type = Components.MeetingHud;
				for (let i=0;i<this.length;i++){
					this.Data.push(StateByte.parse(source.readU8()));
				}
				break;
			case ObjectType.Player:
				if (componentIndex == 0){
					this.Type = Components.PlayerControl;
					this.Data.push({
						new: spawn ? source.readBoolean() : false,
						id: source.readU8()
					});
				}else if (componentIndex == 2){
					this.Type = Components.CustomTransform;
					let dataObj: CustomTransformData = {
						lastSequenceId: source.readU16(),
						targetPosition: new Vector2().parse(source),
						targetVelocity: new Vector2().parse(source)
					};
					this.Data.push(dataObj);
				}else {
					this.Type = Components.PhysicsControl;
				}
				break;
			case ObjectType.LobbyBehavior:
				this.Type = Components.LobbyBehavior;
				//nothing except *PURE CRING*
				break;
			case ObjectType.GameData:
				if (componentIndex == 0){
					this.Type = Components.GameData;
					let o: GameDataPlayerData = {
						Players: []
					};
					//let NetID = source.readVarInt();
					//let Length = source.readU16();
					// let Tag = source.readU8();
					let PlayerCount = source.readU8();
					let Players = Array(PlayerCount);
					for (let i = 0; i < PlayerCount; i++) {
						Players[i] = {}
						let PlayerData = Players[i]
						PlayerData.PlayerID = source.readU8();
						PlayerData.PlayerName = source.readString();
						PlayerData.Color = source.readVarInt();
						PlayerData.HatID = source.readVarInt();
						PlayerData.PetID = source.readVarInt();
						PlayerData.SkinID = source.readVarInt();
						let FlagsBitfield = source.readU8();
						PlayerData.Flags = {
							Disconnected: (FlagsBitfield & 0b00000001) != 0,
							Impostor: (FlagsBitfield & 0b00000010) != 0,
							Dead: (FlagsBitfield & 0b00000100) != 0
						}
						PlayerData.TaskAmount = source.readU8();
						PlayerData.Tasks = Array(PlayerData.TaskAmount)
						for (let i2 = 0; i2 < PlayerData.Tasks.length; i2++) {
							PlayerData.Tasks[i2] = {
								TaskID: source.readVarInt(),
								TaskCompleted: source.readBoolean()
							}
						}
					}
					o.PlayerCount=PlayerCount;
					o.Players=Players;
					this.Data.push(o);
					break;
				}
				if (componentIndex == 1) {
					let o: PlayerVoteBanSystem = {
						Players: new Map()
					};
					this.Type = Components.VoteBanSystem;
					let ArrLen = source.readU8()
					for (let i = 0; i < ArrLen; i++) {
						let ClientID = source.read32();
						if(ClientID == 0x00) break;
						if(!o.Players.has(ClientID)) {
							o.Players.set(ClientID, [
								source.readVarInt(),
								source.readVarInt(),
								source.readVarInt(),
							])
						}
					}
					this.Data.push(o)
					//NetID packedInt32
					//Message Length,Tag
					//Length Byte
						//ClientID Int32
						//Length Byte
							//ClientID VarInt
				}
		}
	}

	serialize():PolusBuffer{
		let pb = new PolusBuffer();
		let datalen = this.Data.length;
		switch (this.Type){
			case Components.ShipStatus:
				switch (this.room.settings.Map){
					case AmongUsMap.THE_SKELD:
						for(let i=0;i<datalen;i++){
							let data: ShipStatusData = <ShipStatusData>this.Data[i];
							statusHandler.get(data.system).write(data.data, pb, this.room);
						}
						break;
				}
				break;
		}
		return pb
	}
}