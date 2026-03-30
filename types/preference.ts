export type PreferenceValue = {
    name: string
    createdAt: Date
    content: Object
}

export type UserPreference = {
    key: string
    last: PreferenceValue
    list: PreferenceValue[]
}