// MQTT broker adresi
const brokerUrl = 'wss://broker.emqx.io:8084/mqtt';

// MQTT istemcisi oluştur
const client = mqtt.connect(brokerUrl);

// Abone olunacak konular
const topics = ['odaSicaklik', 'disSicaklik', 'disNem', 'onBahce1_sure', 'onBahce2_sure', 'arkaBahce1_sure', 'arkaBahce2_sure'];

// Bağlantı kurulduğunda çalışacak fonksiyon
client.on('connect', function () {
    console.log('MQTT Broker\'a bağlanıldı');
    // Konulara abone ol
    client.subscribe(topics, function (err) {
        if (!err) {
            console.log('Konulara abone olundu:', topics.join(', '));
        }
    });
});

// Mesaj alındığında çalışacak fonksiyon
client.on('message', function (topic, message) {
    let formattedMessage = message.toString();

    // İlk iki rakamdan sonra ":" ekle
    if (['odaSicaklik', 'disSicaklik', 'disNem'].includes(topic)) {
        formattedMessage = formattedMessage.slice(0, 2) + ':' + formattedMessage.slice(2);
    }

    if (topic === 'odaSicaklik') {
        document.getElementById('temperature').innerText = `Oda Sıcaklığı: ${formattedMessage} °C`;
    } else if (topic === 'disSicaklik') {
        document.getElementById('outsideTemp').innerText = `Dış Sıcaklık: ${formattedMessage} °C`;
    } else if (topic === 'disNem') {
        document.getElementById('outsideHum').innerText = `Dış Nem: ${formattedMessage} %`;
    } else if (topic === 'onBahce1_sure') {
        updateGauge('gaugeOnBahce1', formattedMessage);
    } else if (topic === 'onBahce2_sure') {
        updateGauge('gaugeOnBahce2', formattedMessage);
    } else if (topic === 'arkaBahce1_sure') {
        updateGauge('gaugeArkaBahce1', formattedMessage);
    } else if (topic === 'arkaBahce2_sure') {
        updateGauge('gaugeArkaBahce2', formattedMessage);
    }

    // LocalStorage'a kaydet
    localStorage.setItem(topic, formattedMessage);
});

// Bağlantı hatası durumunda çalışacak fonksiyon
client.on('error', function (error) {
    console.error('Bağlantı hatası:', error);
});

// Sliderların değerlerini güncelleyen ve MQTT mesajı gönderen fonksiyon
function setupSlider(sliderId, valueId, topic) {
    const slider = document.getElementById(sliderId);
    const valueDisplay = document.getElementById(valueId);

    slider.addEventListener('input', function () {
        const value = slider.value;
        const formattedValue = formatSliderValue(value);
        valueDisplay.innerText = formattedValue;

        // MQTT mesajı gönder
        client.publish(topic, value);
    });
}

// Sliderları kur
setupSlider('sliderOnBahce1', 'onBahce1Value', 'onBahce1_sure');
setupSlider('sliderOnBahce2', 'onBahce2Value', 'onBahce2_sure');
setupSlider('sliderArkaBahce1', 'arkaBahce1Value', 'arkaBahce1_sure');
setupSlider('sliderArkaBahce2', 'arkaBahce2Value', 'arkaBahce2_sure');

// Göstergeleri güncelleyen fonksiyon
function updateGauge(gaugeId, value) {
    google.charts.load('current', {'packages':['gauge']});
    google.charts.setOnLoadCallback(drawChart);

    function drawChart() {
        var data = google.visualization.arrayToDataTable([
            ['Label', 'Value'],
            [gaugeId.replace('gauge', '').replace('Value', ''), parseFloat(value)]
        ]);

        var options = {
            width: 450,
            height: 225,
            redFrom: 200, redTo: 240,
            yellowFrom: 100, yellowTo: 200,
            greenFrom: 0, greenTo: 100,
            minorTicks: 5,
            max: 240
        };

        var chart = new google.visualization.Gauge(document.getElementById(gaugeId));
        chart.draw(data, options);
    }
}

// Tüm slider değerlerini sıfırlayan ve MQTT mesajı gönderen fonksiyon
function resetValues() {
    const sliders = ['sliderOnBahce1', 'sliderOnBahce2', 'sliderArkaBahce1', 'sliderArkaBahce2'];
    const values = ['onBahce1Value', 'onBahce2Value', 'arkaBahce1Value', 'arkaBahce2Value'];
    const topics = ['onBahce1_sure', 'onBahce2_sure', 'arkaBahce1_sure', 'arkaBahce2_sure'];

    sliders.forEach((sliderId, index) => {
        const slider = document.getElementById(sliderId);
        const valueDisplay = document.getElementById(values[index]);
        const topic = topics[index];

        slider.value = 0;
        valueDisplay.innerText = '0:00 sn.';

        // MQTT mesajı gönder
        client.publish(topic, '0');
    });
}

// Slider değerini "dakika:saniye sn." formatına dönüştüren yardımcı fonksiyon
function formatSliderValue(value) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds} sn.`;
}

// MQTT mesajlarını indiren fonksiyon
function downloadMessages() {
    const topics = ['odaSicaklik', 'disSicaklik', 'disNem', 'onBahce1_sure', 'onBahce2_sure', 'arkaBahce1_sure', 'arkaBahce2_sure'];
    let textContent = '';

    topics.forEach(topic => {
        const value = localStorage.getItem(topic);
        const currentTime = new Date().toLocaleString(); // Sistem saat bilgisi

        textContent += `${topic}: ${value} (${currentTime})\n`;
    });

    const messageDisplay = document.getElementById('messageDisplay');
    messageDisplay.value = textContent.trim(); // Trim to remove extra newline at the end

    // Opsiyonel: Pencereyi açabilirsiniz
    // alert('MQTT Mesajları başarıyla indirildi ve aşağıdaki alanda görüntüleniyor.');

    // Alternatif olarak, indirme işlemi devam edebilir
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'mqtt_messages.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
