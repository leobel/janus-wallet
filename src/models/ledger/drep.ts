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
}