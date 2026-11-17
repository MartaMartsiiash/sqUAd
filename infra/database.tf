# One DynamoDB table for rooms and payments (PROJECT.md, section 8).
# On-demand billing: no capacity to plan, and it stays inside the always-free tier.

resource "aws_dynamodb_table" "main" {
  name         = var.project_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # Rooms carry expires_at (24 h after creation); DynamoDB deletes them for free.
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }
}
