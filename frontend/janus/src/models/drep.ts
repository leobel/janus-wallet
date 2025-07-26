export interface Drep {
    drep_id: string
    hex: string
    amount?: string
    active?: boolean,
    active_epoch?: number,
    has_script?: boolean,
    retired?: boolean,
    expired?: boolean,
    last_active_epoch?: number
    url?: string
    hash?: string
    json_metadata?: any
    bytes?: string
    is_always_abstain?: boolean
    is_always_non_confindence?: boolean
}

export const AlwaysAbstainId = "drep_always_abstain"
export const AlwaysNoConfidenceId = "drep_always_no_confidence"
export const AlwaysAbstain = "AlwaysAbstain"
export const AlwaysNoConfidence = "AlwaysNoConfidence"

export type DrepType = "Key" | "Script" | FixedDrepType
export type FixedDrepType = 
    | typeof AlwaysAbstain 
    | typeof AlwaysNoConfidence