# Deploy

데모는 홈랩 K3s에 GitOps로 배포한다. 이 레포가 매니페스트의 SSOT다.

## 파이프라인
- 이미지: GitHub Actions가 빌드해 GHCR에 올린다.
- 매니페스트: 이 레포의 `infra/k8s/` (Kustomize `base/` + `overlays/prod/`).
- 배포: 홈랩의 ArgoCD Application이 이 레포의 `infra/k8s/overlays/prod`를 바라본다.
- 이미지 갱신: ArgoCD Image Updater를 쓴다. `latest` 태그와 수동 재시작은 쓰지 않는다.

## 매니페스트 규칙
- `kustomization.yaml`에 `namespace:`를 쓰지 않는다. 네임스페이스는 ArgoCD `destination.namespace`가 SSOT다.
- `replicas: 1`, 전략은 `Recreate`. SQLite 파일과 SSE 구독이 프로세스 안에 있다.
- `data/`(SQLite와 클립)는 PVC에 마운트한다.
- 헬스체크 엔드포인트 `/healthz`를 구현하고 liveness와 readiness probe에 쓴다.
- Ingress는 cert-manager TLS를 쓴다. 카메라와 마이크 접근에 HTTPS가 필요하다.
- 이 앱은 시크릿이 없다. SealedSecret은 만들지 않는다.

## 배포 검증 (머지 후)
머지는 배포 완료가 아니다. 위에서부터 확인한다.
1. Pod Ready, RestartCount 안정
2. ArgoCD가 본 리비전이 머지 커밋과 같은지 대조한 뒤 `Synced + Healthy`
3. Service Endpoints 채워짐, 클러스터 내부 HTTP 200
4. Ingress TLS 인증서 Ready, 외부 HTTP 200

## 폴백
- 홈랩이 응답하지 않으면 녹화 데모 영상 링크를 README의 Demo 줄에 둔다.
