export interface ColorFilter {
    desaturate?: boolean;
    blend?: string | ColorGradient;
    blendMode?: string;
    brightness?: number | BrightnessGradient;
    contrast?: number;
}
export interface ColorGradient {
    gradient: "linear" | "radial";
    values: number[];
    colors: Array<[number, string]>;
}
export interface BrightnessGradient {
    gradient: "linear" | "radial";
    values: number[];
    adjustments: Array<[number, number]>;
}
export interface LayerSpec {
    id: string;
    src: string;
    z: number;
    filter?: ColorFilter;
    alpha?: number;
    dx?: number;
    dy?: number;
    maskSrcs?: string[];
    show?: boolean;
    animation?: "blink" | "playerBreath" | string;
    frame?: number;
    frameCount?: number;
    sourceClip?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
export type BodyShape = "经典" | "瘦长" | "曲线" | "柔软";
export type ArmState = "idle" | "cover";
export type RightArmState = "idle" | "cover" | "hold";
export type HairLength = "短" | "及肩" | "到胸" | "到腹" | "到大腿" | "到脚";
export type ClothingState = "full" | "torn" | "tattered" | "frayed";
export type ClothingDurability = ClothingState | "完整" | "撕裂" | "破旧" | "磨损";
export interface HairPayload {
    发型?: string;
    刘海?: string;
    长度?: HairLength;
    位置?: "前" | "后";
}
export type HairColorMode = "单色" | "整体" | "拆分";
export type HairColorStyle = "低渐变" | "高渐变" | "分色" | "面部高光";
export interface HairColorDetail {
    分色模式?: HairColorStyle;
    发色?: string;
    第二发色?: string;
}
export interface HairColorDetailsPayload {
    头发?: HairColorDetail;
    刘海?: HairColorDetail;
}
export interface EyePayload {
    左眼瞳色?: string;
    右眼瞳色?: string;
    无神?: boolean;
    半睁眼?: boolean;
    血丝眼?: boolean;
    流泪程度?: number;
}
export interface ClothingWorn {
    名称: string;
    主色调?: string;
    第二色调?: string;
    图案?: string;
    花纹?: string;
    状态?: ClothingState;
    耐久度?: ClothingDurability;
    胸部层级?: number;
    替代?: boolean;
    兜帽?: "戴上" | "放下";
    卷袖?: boolean;
}
export type ClothingSlotPayload = ClothingWorn | null | undefined;
export interface TransformDetail {
    翅膀?: string;
    翅膀状态?: "idle" | "cover" | "flaunt";
    左翅膀状态?: "idle" | "cover";
    右翅膀状态?: "idle" | "cover";
    翅膀层级?: "前" | "后";
    光环?: string;
    耳朵?: string;
    尾巴?: string;
    尾巴状态?: "idle" | "cover" | "flaunt";
    尾巴层级?: "前" | "后";
    角?: string;
    颊羽?: string;
    覆羽?: string;
    阴毛?: string;
    眼睛?: string;
    脸颊?: string;
}
export interface CumPayload {
    胸部?: number;
    脸?: number;
    脚?: number;
    左臂?: number;
    右臂?: number;
    颈部?: number;
    大腿?: number;
    腹部?: number;
    阴道滴落?: number;
    肛门滴落?: number;
    口部滴落?: number;
}
export interface CondomPayload {
    类型?: "plain";
    颜色?: string;
}
export interface CharacterPayload {
    身形?: BodyShape;
    胸部?: number;
    阴茎?: boolean;
    阴茎状态?: "soft" | "hard";
    阴茎大小?: number;
    包茎?: boolean;
    睾丸?: boolean;
    避孕套?: CondomPayload;
    精液?: CumPayload;
    孕肚?: number;
    覆盖孕肚?: boolean;
    左臂?: ArmState;
    右臂?: RightArmState;
    发型?: string | HairPayload;
    发色?: string;
    发色模式?: HairColorMode;
    发色详情?: HairColorDetailsPayload;
    发长?: HairLength;
    刘海?: string;
    头发位置?: "前" | "后";
    仪态?: string;
    眼睛?: EyePayload;
    眉毛?: "低" | "中" | "高" | "高潮";
    嘴部?: "平静" | "微笑" | "皱眉" | "哭泣" | "咀嚼";
    脸红?: number;
    脸红程度?: number;
    泪水?: number;
    衣物?: {
        上装?: ClothingSlotPayload;
        下装?: ClothingSlotPayload;
        内衣上装?: ClothingSlotPayload;
        内衣下装?: ClothingSlotPayload;
        头饰?: ClothingSlotPayload;
        面饰?: ClothingSlotPayload;
        颈部?: ClothingSlotPayload;
        手饰?: ClothingSlotPayload;
        手持物品?: ClothingSlotPayload;
        鞋子?: ClothingSlotPayload;
        腿饰?: ClothingSlotPayload;
        私部装备?: ClothingSlotPayload;
    };
    转化?: string | {
        类型?: string;
        细节?: TransformDetail;
    };
    转化细节?: TransformDetail;
}
export interface BuildContext {
    payload: CharacterPayload;
    baseUrl: string;
    bodyShape: string;
    breastSize: number;
    headMaskSrcs?: string[];
    lowerMaskSrcs?: string[];
    legsMaskSrcs?: string[];
}
