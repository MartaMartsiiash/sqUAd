variable "project_name" {
  type        = string
  default     = "squad"
  description = "Prefix for every resource name."
}

variable "region" {
  type        = string
  default     = "eu-north-1"
  description = "Stockholm: the region the course AWS organisation allows (its policy denies others)."
}

variable "google_client_id" {
  type        = string
  default     = ""
  description = "Google OAuth web client id. Empty: email + password sign-in only."
}

variable "google_client_secret" {
  type        = string
  default     = ""
  sensitive   = true
  description = "Google OAuth client secret. Pass as TF_VAR_google_client_secret, never commit it."
}

variable "mono_jar_url" {
  type        = string
  default     = ""
  description = "Link to the monobank jar shown to donors, e.g. https://send.monobank.ua/jar/XXXX"
}

variable "premium_price_uah" {
  type        = number
  default     = 50
  description = "Smallest donation that unlocks unlimited games for a room (after the free ones)."
}

variable "local_dev_urls" {
  type        = list(string)
  default     = ["http://localhost:5173"]
  description = "Extra origins allowed to sign in and call the API (local development)."
}
