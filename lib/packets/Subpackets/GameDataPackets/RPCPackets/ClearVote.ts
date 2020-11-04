import PolusBuffer from "../../../../util/PolusBuffer.js";

export interface ClearVotePacket { }

export default class ClearVote {
	parse(packet: PolusBuffer): ClearVotePacket {
		return {}
	}
	serialize(packet: ClearVotePacket): PolusBuffer {
		return new PolusBuffer(0);
	};
};

