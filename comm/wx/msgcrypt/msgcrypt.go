package msgcrypt

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/xml"
	"errors"
	"fmt"
	"sort"

	"github.com/WeixinCloud/wxcloudrun-wxcomponent/comm/encrypt"
)

type encryptedXMLBody struct {
	XMLName xml.Name `xml:"xml"`
	Encrypt string   `xml:"Encrypt"`
}

// IsFromWeixin 判断是否为微信云托管转发（明文JSON路径）
func IsFromWeixin(wxSourceHeader string) bool {
	return wxSourceHeader != ""
}

// VerifySignature 验证微信消息签名
// msg_signature = SHA1(sort(token, timestamp, nonce, encrypt))
func VerifySignature(token, timestamp, nonce, encryptMsg, msgSignature string) bool {
	params := []string{token, timestamp, nonce, encryptMsg}
	sort.Strings(params)
	h := sha1.New()
	for _, p := range params {
		h.Write([]byte(p))
	}
	return fmt.Sprintf("%x", h.Sum(nil)) == msgSignature
}

// DecryptMsg 解密微信AES-CBC加密的消息体
// encodingAESKey 为微信开放平台上的43位base64字符串
// 返回解密后的明文XML字节
func DecryptMsg(encodingAESKey, encryptedMsg string) ([]byte, error) {
	// 微信要求末尾补一个 "=" 再做 base64 解码
	aesKey, err := base64.StdEncoding.DecodeString(encodingAESKey + "=")
	if err != nil {
		return nil, fmt.Errorf("decode aes key: %v", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encryptedMsg)
	if err != nil {
		return nil, fmt.Errorf("decode encrypt msg: %v", err)
	}

	// 使用现有的 AES-CBC 解密，IV = key[:16]
	plaintext, err := encrypt.AesDecrypt(ciphertext, aesKey)
	if err != nil {
		return nil, fmt.Errorf("aes decrypt: %v", err)
	}

	// 格式: random(16B) + msg_len(4B,大端) + msg_xml + appid
	if len(plaintext) < 20 {
		return nil, errors.New("decrypted content too short")
	}
	msgLen := binary.BigEndian.Uint32(plaintext[16:20])
	if uint32(len(plaintext)) < 20+msgLen {
		return nil, errors.New("invalid msg length in decrypted content")
	}

	return plaintext[20 : 20+msgLen], nil
}

// ParseAndDecrypt 解析加密XML包体，验签后解密，返回明文XML
func ParseAndDecrypt(body []byte, token, timestamp, nonce, msgSignature, encodingAESKey string) ([]byte, error) {
	var encBody encryptedXMLBody
	if err := xml.Unmarshal(body, &encBody); err != nil {
		return nil, fmt.Errorf("parse encrypted xml: %v", err)
	}

	if !VerifySignature(token, timestamp, nonce, encBody.Encrypt, msgSignature) {
		return nil, errors.New("msg_signature verification failed")
	}

	return DecryptMsg(encodingAESKey, encBody.Encrypt)
}
