# vercel-edge-relay

A minimal Vercel Edge Runtime relay for request normalization and upstream forwarding.

## Overview

This project implements a stateless edge proxy that forwards incoming HTTP requests to a configurable upstream origin while normalizing headers and preserving client attribution.

It is designed for deployment on Vercel Edge Runtime.

## Features

- Edge-native request handler
- Header normalization and hop-by-hop header stripping
- Preserves client IP via `x-forwarded-for`
- Dynamic upstream routing via `process.env.TD`
- Streaming request forwarding

## Configuration

Set the upstream origin:

```bash
TD=my.domain.com
```

