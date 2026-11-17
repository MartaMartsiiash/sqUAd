# The API: FastAPI on AWS Lambda behind a function URL (an HTTPS endpoint with
# no load balancer). It bills only while a request runs, so an idle month is $0.

data "archive_file" "lambda" {
  type        = "zip"
  source_dir  = "${path.module}/../build/lambda" # made by `make build-lambda`
  output_path = "${path.module}/../build/lambda.zip"
}

resource "random_password" "mono_webhook" {
  length  = 32
  special = false
}

resource "aws_iam_role" "api" {
  name = "${var.project_name}-api"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Least privilege: the API may write logs and touch this one table, nothing else.
resource "aws_iam_role_policy" "api" {
  name = "${var.project_name}-api"
  role = aws_iam_role.api.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:Scan"]
        Resource = aws_dynamodb_table.main.arn
      },
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "${aws_cloudwatch_log_group.api.arn}:*"
      },
    ]
  })
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/lambda/${var.project_name}-api"
  retention_in_days = 7
}

resource "aws_lambda_function" "api" {
  function_name    = "${var.project_name}-api"
  role             = aws_iam_role.api.arn
  runtime          = "python3.12"
  architectures    = ["x86_64"]
  handler          = "app.lambda_handler.handler"
  filename         = data.archive_file.lambda.output_path
  source_code_hash = data.archive_file.lambda.output_base64sha256
  memory_size      = 512
  timeout          = 15

  environment {
    variables = {
      STORAGE              = "dynamodb"
      TABLE_NAME           = aws_dynamodb_table.main.name
      COGNITO_REGION       = var.region
      COGNITO_USER_POOL_ID = aws_cognito_user_pool.main.id
      COGNITO_CLIENT_ID    = aws_cognito_user_pool_client.web.id
      CORS_ORIGINS         = join(",", local.site_urls)
      MONO_WEBHOOK_SECRET  = random_password.mono_webhook.result
      MONO_JAR_URL         = var.mono_jar_url
      PREMIUM_PRICE_UAH    = tostring(var.premium_price_uah)
    }
  }

  depends_on = [aws_cloudwatch_log_group.api, aws_iam_role_policy.api]
}

# CORS is answered by FastAPI itself; configuring it here too would send the
# headers twice and the browser would reject the response.
resource "aws_lambda_function_url" "api" {
  function_name      = aws_lambda_function.api.function_name
  authorization_type = "NONE"
}

# A public function URL needs two permissions: InvokeFunctionUrl for the URL
# itself, and InvokeFunction limited to calls that arrive through that URL.
resource "aws_lambda_permission" "api_url" {
  statement_id           = "FunctionURLAllowPublicAccess"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.api.function_name
  principal              = "*"
  function_url_auth_type = "NONE"
}

resource "aws_lambda_permission" "api_url_invoke" {
  statement_id             = "FunctionURLAllowInvoke"
  action                   = "lambda:InvokeFunction"
  function_name            = aws_lambda_function.api.function_name
  principal                = "*"
  invoked_via_function_url = true
}
