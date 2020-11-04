import PolusBuffer from "../../util/PolusBuffer.js";
import RoomSettings from "../PacketElements/RoomSettings.js";

export interface GameSearchPacket {
	RoomSettings: RoomSettings;
}

export class GameSearch {
	parse(packet: PolusBuffer): GameSearchPacket {
		var rs = new RoomSettings();
		rs.parse(packet)
		const gameCreatePacket: GameSearchPacket = {
			RoomSettings: rs
		}
		return gameCreatePacket;
	}

	serialize(packet: GameSearchPacket): PolusBuffer {
		return packet.RoomSettings.serialize();
	};
}