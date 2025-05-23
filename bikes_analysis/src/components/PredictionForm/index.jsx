import React, { useState } from 'react';
import axios from 'axios';
import {
  TextField,
  Button,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Container,
  Divider,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormHelperText
} from '@mui/material';
import { styled } from '@mui/system';

const StyledCard = styled(Card)(({ theme }) => ({
  marginTop: theme.spacing(3),
  padding: theme.spacing(2),
  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  borderRadius: '12px',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  margin: theme.spacing(1),
  borderRadius: '8px',
}));

const PredictionForm = () => {
  const [formData, setFormData] = useState({
    season: '',
    mnth: '',
    hr: '',
    weekday: '',
    temp: '',
    weathersit: '',
    hum: '',
    windspeed: '',
    holiday: '',
    workingday: ''
  });
  const [prediction, setPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [actualValue, setActualValue] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [formErrors, setFormErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormErrors({ ...formErrors, [name]: '' }); // Очищаем ошибки при изменении

    // Если изменён сезон, сбрасываем месяц или фильтруем доступные месяцы
    if (name === 'season' && value) {
      setFormData(prev => ({
        ...prev,
        mnth: '', // Сбрасываем месяц при смене сезона
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.season) errors.season = 'Сезон обязателен';
    if (!formData.mnth) errors.mnth = 'Месяц обязателен';
    if (!formData.hr) errors.hr = 'Час обязателен';
    if (!formData.weekday) errors.weekday = 'День недели обязателен';
    if (!formData.temp) errors.temp = 'Температура обязательна';
    return errors;
  };

  const handlePredict = async (e) => {
    e.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    try {
      const response = await axios.post('http://localhost:5000/predict', formData);
      setPrediction(response.data.prediction);
    } catch (error) {
      console.error('Ошибка прогноза:', error);
    }
  };

  const handleGetHistory = async (e) => {
    if(e){
        e.preventDefault();
    }
    try {
      const response = await axios.get('http://localhost:5000/predict');
      setHistory(response.data.history);
    } catch (error) {
      console.error('Ошибка получения истории:', error);
    }
  };

  const handleUpdateActual = async (e) => {
    e.preventDefault();
    if (!selectedRequestId) {
      alert('Выберите Request ID из истории');
      return;
    }
    try {
      await axios.post('http://localhost:5000/update-actual', {
        request_id: selectedRequestId,
        actual_rentals: actualValue
      });
      handleGetHistory()
      alert('Фактические данные обновлены');
    } catch (error) {
      console.error('Ошибка обновления:', error);
    }
  };

  // Определение доступных месяцев для выбранного сезона
  const getAvailableMonths = () => {
    switch (formData.season) {
      case '1': // Весна
        return [3, 4, 5];
      case '2': // Лето
        return [6, 7, 8];
      case '3': // Осень
        return [9, 10, 11];
      case '4': // Зима
        return [12, 1, 2];
      default:
        return [];
    }
  };

  return (
    <Container maxWidth="sm">
      <StyledCard>
        <CardContent>
          <Typography variant="h4" align="center" gutterBottom>
            Прогноз спроса на аренду велосипедов
          </Typography>

          <form onSubmit={handlePredict}>
            <FormControl fullWidth variant="outlined" error={!!formErrors.season} sx={{ mb: 2 }}>
              <InputLabel>Сезон</InputLabel>
              <Select name="season" value={formData.season} onChange={handleChange} label="Сезон" required>
                <MenuItem value="">Выберите сезон</MenuItem>
                <MenuItem value="1">Весна</MenuItem>
                <MenuItem value="2">Лето</MenuItem>
                <MenuItem value="3">Осень</MenuItem>
                <MenuItem value="4">Зима</MenuItem>
              </Select>
              {formErrors.season && <FormHelperText>{formErrors.season}</FormHelperText>}
            </FormControl>

            <FormControl fullWidth variant="outlined" error={!!formErrors.mnth} sx={{ mb: 2 }}>
              <InputLabel>Месяц</InputLabel>
              <Select name="mnth" value={formData.mnth} onChange={handleChange} label="Месяц" required>
                <MenuItem value="">Выберите месяц</MenuItem>
                {getAvailableMonths().map(m => (
                  <MenuItem key={m} value={m}>
                    {new Date(0, m - 1).toLocaleString('ru', { month: 'long' })}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.mnth && <FormHelperText>{formErrors.mnth}</FormHelperText>}
            </FormControl>

            <TextField
              label="Час (0-23)"
              name="hr"
              type="number"
              value={formData.hr}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ min: 0, max: 23 }}
              variant="outlined"
              error={!!formErrors.hr}
              helperText={formErrors.hr}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth variant="outlined" error={!!formErrors.weekday} sx={{ mb: 2 }}>
              <InputLabel>День недели</InputLabel>
              <Select name="weekday" value={formData.weekday} onChange={handleChange} label="День недели" required>
                <MenuItem value="">Выберите день</MenuItem>
                <MenuItem value="0">Понедельник</MenuItem>
                <MenuItem value="1">Вторник</MenuItem>
                <MenuItem value="2">Среда</MenuItem>
                <MenuItem value="3">Четверг</MenuItem>
                <MenuItem value="4">Пятница</MenuItem>
                <MenuItem value="5">Суббота</MenuItem>
                <MenuItem value="6">Воскресенье</MenuItem>
              </Select>
              {formErrors.weekday && <FormHelperText>{formErrors.weekday}</FormHelperText>}
            </FormControl>

            <TextField
              label="Температура (°C)"
              name="temp"
              type="number"
              value={formData.temp}
              onChange={handleChange}
              fullWidth
              required
              step="0.1"
              variant="outlined"
              error={!!formErrors.temp}
              helperText={formErrors.temp}
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>Погода</InputLabel>
              <Select name="weathersit" value={formData.weathersit} onChange={handleChange} label="Погода">
                <MenuItem value="">Не выбрано</MenuItem>
                <MenuItem value="1">Чисто</MenuItem>
                <MenuItem value="2">Облачно</MenuItem>
                <MenuItem value="3">Дождь</MenuItem>
                <MenuItem value="4">Сильный дождь</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Влажность (%)"
              name="hum"
              type="number"
              value={formData.hum}
              onChange={handleChange}
              fullWidth
              inputProps={{ min: 0, max: 100 }}
              variant="outlined"
              sx={{ mb: 2 }}
            />

            <TextField
              label="Скорость ветра (м/с)"
              name="windspeed"
              type="number"
              value={formData.windspeed}
              onChange={handleChange}
              fullWidth
              variant="outlined"
              sx={{ mb: 2 }}
            />

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>Праздник</InputLabel>
              <Select name="holiday" value={formData.holiday} onChange={handleChange} label="Праздник">
                <MenuItem value="">Не выбрано</MenuItem>
                <MenuItem value="true">Праздник</MenuItem>
                <MenuItem value="false">Рабочий день</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
              <InputLabel>Рабочий день</InputLabel>
              <Select name="workingday" value={formData.workingday} onChange={handleChange} label="Рабочий день">
                <MenuItem value="">Не выбрано</MenuItem>
                <MenuItem value="true">Рабочий день</MenuItem>
                <MenuItem value="false">Выходной</MenuItem>
              </Select>
            </FormControl>

            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <StyledButton type="submit" variant="contained" color="primary">
                Получить прогноз
              </StyledButton>
            </Box>
          </form>

          {prediction && (
            <Box mt={2}>
              <Typography variant="h6" color="primary" align="center">
                Прогноз: {prediction}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleGetHistory}>
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <StyledButton type="submit" variant="outlined" color="secondary">
                Показать историю
              </StyledButton>
            </Box>
          </form>

          {history.length > 0 && (
            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                История:
              </Typography>
              <List>
                {history.map((item, index) => (
                  <ListItem
                    style={{background: `${selectedRequestId === item.request_id? '#c9c4c4': 'none'}`}}
                    key={index}
                    sx={{ borderBottom: '1px solid #eee' }}
                    button
                    onClick={() => setSelectedRequestId(item.request_id)}
                    selected={selectedRequestId === item.request_id}
                  >
                    <ListItemText
                      primary={`Request ID: ${item.request_id}`}
                      secondary={`Прогноз: ${item.prediction}, Фактическое: ${item.actual || 'Нет'}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          <form onSubmit={handleUpdateActual}>
            <TextField
              label="Фактическое значение"
              type="number"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              fullWidth
              required
              variant="outlined"
              sx={{ mb: 2 }}
            />
            <Box sx={{ textAlign: 'center' }}>
              <StyledButton type="submit" variant="contained" color="success">
                Обновить фактические данные
              </StyledButton>
            </Box>
          </form>
        </CardContent>
      </StyledCard>
    </Container>
  );
};

export default PredictionForm;