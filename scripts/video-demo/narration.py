"""Generate the approved Vietnamese male narration and timed word metadata."""
import argparse, asyncio, hashlib, json, subprocess
from pathlib import Path
import edge_tts
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'work/video-demo-vi';OUT.mkdir(parents=True,exist_ok=True)
M=json.loads((ROOT/'scripts/video-demo/storyboard.vi.json').read_text(encoding='utf-8'))
async def generate():
    semaphore=asyncio.Semaphore(2)
    async def one(scene):
        async with semaphore:
            spoken=scene['narration'].replace('pipicachu','pi pi ca chu')
            key=hashlib.sha256((spoken+M['voice']+M['rate']+M['pitch']).encode()).hexdigest()
            audio=OUT/(scene['id']+'.mp3');metadata=OUT/(scene['id']+'-words.json');cache=OUT/(scene['id']+'.sha')
            if not(audio.exists() and metadata.exists() and cache.exists() and cache.read_text()==key):
                for attempt in range(3):
                    words=[]
                    try:
                        with audio.open('wb') as f:
                            stream=edge_tts.Communicate(spoken,M['voice'],rate=M['rate'],pitch=M['pitch'],boundary='WordBoundary').stream()
                            async for chunk in stream:
                                if chunk['type']=='audio':f.write(chunk['data'])
                                elif chunk['type']=='WordBoundary':words.append({'start':chunk['offset']/1e7,'end':(chunk['offset']+chunk['duration'])/1e7,'text':chunk['text']})
                        break
                    except Exception:
                        if attempt==2:raise
                        await asyncio.sleep(3)
                metadata.write_text(json.dumps(words,ensure_ascii=False,indent=2),encoding='utf-8');cache.write_text(key)
            info=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(audio)]))
            scene['speechDuration']=float(info['format']['duration'])
            scene['duration']=max(scene['duration'],round(scene['speechDuration']+1.2,2))
            print('VOICE',scene['id'],scene['speechDuration'],'scene',scene['duration'],flush=True)
    await asyncio.gather(*(one(scene) for scene in M['scenes']))
    (OUT/'timed-storyboard.json').write_text(json.dumps(M,ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--source',required=True,type=Path)
    args=parser.parse_args();M['source']=str(args.source.resolve(strict=True));asyncio.run(generate())
