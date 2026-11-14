"use client";

import { Mic } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { send } from "@/lib/api-client";
import { pickMimeType } from "@/lib/clip";

const MAX_SECONDS = 10;

const MIC_HELP =
  "마이크 권한이 필요해요. 주소창 왼쪽의 사이트 설정에서 마이크를 허용한 뒤 다시 열어 주세요.";

export function ClipRecorder({
  groupId,
  fromMemberId,
  onClose,
}: {
  groupId: string;
  fromMemberId: string;
  onClose: () => void;
}) {
  const [cameraOn, setCameraOn] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const previewRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    let active = true;
    let opened: MediaStream | null = null;
    (async () => {
      setError("");
      try {
        opened = await navigator.mediaDevices.getUserMedia({
          video: cameraOn ? { facingMode: "user" } : false,
          audio: true,
        });
      } catch {
        if (cameraOn) {
          try {
            opened = await navigator.mediaDevices.getUserMedia({ audio: true });
            setNotice("카메라를 쓸 수 없어서 음성만 녹음해요.");
            if (active) setCameraOn(false);
          } catch {
            if (active) setError(MIC_HELP);
          }
        } else if (active) {
          setError(MIC_HELP);
        }
      }
      if (!active) {
        opened?.getTracks().forEach((t) => t.stop());
        return;
      }
      setStream(opened);
    })();
    return () => {
      active = false;
      opened?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOn]);

  useEffect(() => {
    if (previewRef.current) previewRef.current.srcObject = stream;
  }, [stream]);

  function record() {
    if (!stream) return;
    const withVideo = stream.getVideoTracks().length > 0;
    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t), withVideo);
    if (!mimeType) return setError("이 브라우저는 녹화를 지원하지 않아요. Chrome을 써 주세요.");

    const chunks: Blob[] = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    recorder.onstop = () => upload(new Blob(chunks, { type: mimeType }));
    recorder.start();

    setLeft(MAX_SECONDS);
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = MAX_SECONDS - Math.floor((Date.now() - started) / 1000);
      setLeft(remaining);
      if (remaining <= 0) stop();
    }, 250);
    recorder.addEventListener("stop", () => clearInterval(timer));
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setLeft(null);
  }

  async function upload(blob: Blob) {
    setSending(true);
    const form = new FormData();
    form.append("fromMemberId", fromMemberId);
    form.append("file", blob, blob.type.startsWith("video/") ? "clip.webm" : "clip-audio.webm");
    const result = await send(`/api/groups/${groupId}/clips`, { method: "POST", body: form });
    setSending(false);
    if (result.error !== undefined) return setError(result.error);
    onClose();
  }

  const recording = left !== null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background text-foreground flex w-full max-w-sm flex-col gap-3 rounded-(--radius) border-[3px] border-foreground p-4 shadow-[4px_4px_0_var(--foreground)]">
        <div>
          <p className="font-semibold">내 깨우기 클립</p>
          <p className="text-muted-foreground text-xs">
            알람이 울리는데 아직 응답 안 한 친구 화면에서 이 클립이 소리 내며 반복돼요.
          </p>
        </div>
        <div className="bg-muted relative aspect-[3/4] overflow-hidden rounded-(--radius) border-[3px] border-foreground">
          {cameraOn ? (
            <video ref={previewRef} autoPlay muted playsInline className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center"><Mic className="text-muted-foreground size-12" aria-hidden /></div>
          )}
          {recording && (
            <span className="absolute top-2 right-2 rounded-[2px] bg-destructive px-2 py-0.5 text-sm text-white">
              ● {left}초
            </span>
          )}
        </div>
        {notice && <p className="text-muted-foreground text-sm">{notice}</p>}
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={recording || sending}
            onClick={() => setCameraOn((v) => !v)}
          >
            {cameraOn ? "카메라 끄기" : "카메라 켜기"}
          </Button>
          {recording ? (
            <Button className="flex-1" variant="destructive" onClick={stop}>
              멈추고 보내기
            </Button>
          ) : (
            <Button className="flex-1" disabled={!stream || sending} onClick={record}>
              {sending ? "보내는 중" : `녹화 시작 (최대 ${MAX_SECONDS}초)`}
            </Button>
          )}
        </div>
        <Button variant="ghost" disabled={recording || sending} onClick={onClose}>
          닫기
        </Button>
      </div>
    </div>
  );
}
