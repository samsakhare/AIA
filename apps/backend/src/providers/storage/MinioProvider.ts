import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import crypto from 'crypto';

export class MinioProvider {
  private client: S3Client;
  private bucketName = 'aia-recordings';
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const port = process.env.MINIO_PORT || '9000';
    const accessKeyId = process.env.MINIO_ACCESS_KEY || 'minioadmin';
    const secretAccessKey = process.env.MINIO_SECRET_KEY || 'minioadminpassword';
    
    this.publicUrl = process.env.MINIO_PUBLIC_URL || `http://${endpoint}:${port}`;

    this.client = new S3Client({
      endpoint: `http://${endpoint}:${port}`,
      region: 'us-east-1', // MinIO requires a region, us-east-1 is standard fallback
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.initBucket();
  }

  private async initBucket() {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
    } catch (error: any) {
      if (error.$metadata?.httpStatusCode === 404) {
        // Bucket does not exist, create it
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
          
          // Set public read policy so UI can play audio
          const policy = {
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicRead',
                Effect: 'Allow',
                Principal: '*',
                Action: ['s3:GetObject'],
                Resource: [`arn:aws:s3:::${this.bucketName}/*`]
              }
            ]
          };
          
          await this.client.send(new PutBucketPolicyCommand({
            Bucket: this.bucketName,
            Policy: JSON.stringify(policy)
          }));
          console.log(`Initialized public MinIO bucket: ${this.bucketName}`);
        } catch (createError) {
          console.error('Failed to create MinIO bucket:', createError);
        }
      }
    }
  }

  async uploadTwilioRecording(recordingUrl: string, callSid: string): Promise<string> {
    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
      
      // Twilio recordings are usually accessible by appending .mp3 or .wav
      const response = await axios.get(`${recordingUrl}.mp3`, { 
        responseType: 'arraybuffer',
        auth: twilioSid && twilioAuth ? { username: twilioSid, password: twilioAuth } : undefined
      });
      const buffer = Buffer.from(response.data, 'binary');
      
      const fileName = `${callSid}-${crypto.randomBytes(4).toString('hex')}.mp3`;

      await this.client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: buffer,
        ContentType: 'audio/mpeg'
      }));

      return `${this.publicUrl}/${this.bucketName}/${fileName}`;
    } catch (error) {
      console.error(`Failed to upload recording for CallSid ${callSid}:`, error);
      throw error;
    }
  }
}
