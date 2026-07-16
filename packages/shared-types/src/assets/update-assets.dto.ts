import { PartialType } from "@nestjs/swagger";
import { UploadAssetDto } from "./upload-asset.dto";

export class UpdateAssetDto extends PartialType(UploadAssetDto) {}
