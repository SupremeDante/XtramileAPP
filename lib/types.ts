export interface Track {
  id: string
  user_id: string
  title: string
  file_path: string
  uploader_email: string
  created_at: string
  bpm?: number
  key?: string
  display_order?: number | null
  folder_id?: string | null
}

export interface Folder {
  id: string
  user_id: string
  name: string
  created_at: string
}

export interface TrackVersion {
  id: string
  track_id: string
  version_number: number
  file_path: string
  created_at: string
  is_active: boolean
}
